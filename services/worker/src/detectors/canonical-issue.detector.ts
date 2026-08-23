import { clickhouse } from '@seo/clickhouse';

export interface CanonicalIssueSignal {
  detector_type: 'canonical_issue';
  url: string;
  metrics: {
    issue_type: 'missing_canonical' | 'canonical_mismatch' | 'canonical_broken' | 'canonical_redirect' | 'canonical_loop';
    canonical_url: string;
    details: string;
  };
}

export class CanonicalIssueDetector {
  static async detect(siteId: string): Promise<CanonicalIssueSignal[]> {
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';

    const query = `
      SELECT 
        url,
        argMax(status_code, timestamp) as latest_status_code,
        argMax(canonical_url, timestamp) as latest_canonical_url,
        argMax(issues, timestamp) as latest_issues
      FROM ${clickhouseDb}.crawl_page_observations
      WHERE site_id = '${siteId}' AND timestamp >= today() - 1
      GROUP BY url
    `;

    try {
      const resultSet = await clickhouse.query({
        query,
        format: 'JSONEachRow',
      });
      const rows = (await resultSet.json()) as any[];

      if (rows.length === 0) {
        return [];
      }

      const signals: CanonicalIssueSignal[] = [];
      const statusMap = new Map<string, number>();
      const canonicalMap = new Map<string, string>();
      const issuesMap = new Map<string, string[]>();

      // Populate maps for quick lookup and graph analysis
      for (const row of rows) {
        const url = row.url.trim();
        statusMap.set(url, Number(row.latest_status_code));
        canonicalMap.set(url, (row.latest_canonical_url || '').trim());
        issuesMap.set(url, (row.latest_issues || []) as string[]);
      }

      for (const row of rows) {
        const url = row.url.trim();
        const code = Number(row.latest_status_code);
        const issues = (row.latest_issues || []) as string[];
        const canonical = (row.latest_canonical_url || '').trim();

        // 1. Missing Canonical tag
        if (issues.includes('missing_canonical') || !canonical) {
          signals.push({
            detector_type: 'canonical_issue',
            url,
            metrics: {
              issue_type: 'missing_canonical',
              canonical_url: '',
              details: 'The page is missing a canonical URL tag. Add a self-referential canonical tag to specify the preferred URL for search engines and prevent duplicate content issues.',
            },
          });
          continue; // No need to check other canonical issues if it doesn't have a canonical URL
        }

        // 2. Domain / Protocol mismatch or invalid canonical format
        if (
          issues.includes('canonical_domain_mismatch') ||
          issues.includes('canonical_protocol_mismatch') ||
          issues.includes('canonical_invalid')
        ) {
          let details = 'The canonical URL points to a different domain, protocol, or has an invalid URL format.';
          if (issues.includes('canonical_domain_mismatch')) {
            details = `The canonical URL (${canonical}) points to a different domain than the page domain. Ensure canonicals point to the correct primary domain.`;
          } else if (issues.includes('canonical_protocol_mismatch')) {
            details = `The canonical URL (${canonical}) uses insecure HTTP protocol on an HTTPS site. Update it to use HTTPS.`;
          } else if (issues.includes('canonical_invalid')) {
            details = `The canonical URL (${canonical}) is not a valid absolute URL. Ensure it follows correct URL format.`;
          }

          signals.push({
            detector_type: 'canonical_issue',
            url,
            metrics: {
              issue_type: 'canonical_mismatch',
              canonical_url: canonical,
              details,
            },
          });
        }

        // 2b. Query parameters & facet disputes check
        try {
          const urlObj = new URL(url);
          const hasParams = urlObj.search && urlObj.search.length > 1; // has query params
          if (hasParams && canonical.trim() === url.trim()) {
            signals.push({
              detector_type: 'canonical_issue',
              url,
              metrics: {
                issue_type: 'canonical_mismatch',
                canonical_url: canonical,
                details: `The parameter/facet URL (${url}) has a self-referential canonical tag. Query parameter pages should canonicalize to the clean, parameter-free base URL (${urlObj.protocol}//${urlObj.host}${urlObj.pathname}) to prevent crawl-budget waste and duplicate indexing of identical content facets.`,
              },
            });
          }
        } catch (e) {
          // ignore URL parsing errors
        }

        // 3. Cycle / Loop detection (Page A canonicals to B, and B canonicals to A or forms a loop)
        const path = new Set<string>();
        let current = url;
        let loopDetected = false;
        while (current) {
          if (path.has(current)) {
            loopDetected = true;
            break;
          }
          path.add(current);
          const next = canonicalMap.get(current);
          // Stop if there's no canonical or if it points to a self-referential URL or external URL
          if (!next || next === current) {
            break;
          }
          current = next;
        }

        if (loopDetected) {
          signals.push({
            detector_type: 'canonical_issue',
            url,
            metrics: {
              issue_type: 'canonical_loop',
              canonical_url: canonical,
              details: `A canonical loop detected starting from ${url} (e.g. pointing to ${canonical} which eventually references back to this page). This confuses crawlers and prevents indexing.`,
            },
          });
          continue; // Skip further target status checks if in a loop
        }

        // 4. Checking status of canonical target (if target was crawled)
        if (statusMap.has(canonical)) {
          const targetStatus = statusMap.get(canonical)!;

          // Broken target (4xx / 5xx)
          if (targetStatus >= 400) {
            signals.push({
              detector_type: 'canonical_issue',
              url,
              metrics: {
                issue_type: 'canonical_broken',
                canonical_url: canonical,
                details: `The canonical URL points to a broken page (${canonical}) that returns HTTP status ${targetStatus}. Canonical URLs must point to live (200 OK) destination pages.`,
              },
            });
          }
          // Redirect target (3xx)
          else if (targetStatus >= 300 && targetStatus < 400) {
            signals.push({
              detector_type: 'canonical_issue',
              url,
              metrics: {
                issue_type: 'canonical_redirect',
                canonical_url: canonical,
                details: `The canonical URL points to a redirecting page (${canonical}) returning HTTP status ${targetStatus}. The canonical URL should point directly to the final 200 OK page to avoid wasting crawl budget.`,
              },
            });
          }
        }
      }

      return signals;
    } catch (error) {
      console.error('CanonicalIssueDetector failed:', (error as any).message);
      return [];
    }
  }
}

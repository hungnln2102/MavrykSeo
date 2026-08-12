import { clickhouse } from '@seo/clickhouse';

export interface RedirectIssueSignal {
  detector_type: 'redirect_issue';
  url: string;
  metrics: {
    issue_type: 'redirect_loop' | 'multiple_redirects' | 'temporary_redirect';
    status_code: number;
    details: string;
  };
}

export class RedirectIssueDetector {
  static async detect(siteId: string): Promise<RedirectIssueSignal[]> {
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';

    // Fetch the latest status code and issues for each crawled URL for the site in the last 24 hours
    const query = `
      SELECT 
        url,
        argMax(status_code, timestamp) as latest_status_code,
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

      const signals: RedirectIssueSignal[] = [];

      for (const row of rows) {
        const url = row.url.trim();
        const code = Number(row.latest_status_code);
        const issues = (row.latest_issues || []) as string[];

        // 1. Check for Redirect Loop
        if (issues.includes('redirect_loop') || code === 310) {
          signals.push({
            detector_type: 'redirect_issue',
            url,
            metrics: {
              issue_type: 'redirect_loop',
              status_code: code,
              details: 'Redirect loop detected: the URL redirects back to itself or exceeds maximum redirect hops.',
            },
          });
          // If there is a loop, we skip other redirect issue checks for this page
          continue;
        }

        // 2. Check for Multiple Redirects (redirect chains > 1 hop)
        if (issues.includes('multiple_redirects')) {
          signals.push({
            detector_type: 'redirect_issue',
            url,
            metrics: {
              issue_type: 'multiple_redirects',
              status_code: code,
              details: 'Multiple redirects detected (redirect chain has more than 1 hop). Consolidate to a single direct redirect.',
            },
          });
        }

        // 3. Check for Temporary Redirects (302/307 used instead of 301/308)
        const isTemporary = code === 302 || code === 307;
        if (issues.includes('temporary_redirect') || isTemporary) {
          signals.push({
            detector_type: 'redirect_issue',
            url,
            metrics: {
              issue_type: 'temporary_redirect',
              status_code: code,
              details: `Temporary redirect (${code}) used. If this is a permanent move, use a 301 or 308 redirect instead to preserve link equity.`,
            },
          });
        }
      }

      return signals;
    } catch (error) {
      console.error('RedirectIssueDetector failed:', error.message);
      return [];
    }
  }
}

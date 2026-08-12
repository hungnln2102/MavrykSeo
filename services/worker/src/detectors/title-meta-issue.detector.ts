import { clickhouse } from '@seo/clickhouse';

export interface TitleMetaIssueSignal {
  detector_type: 'title_meta_issue';
  url: string;
  metrics: {
    issue_type:
      | 'missing_title'
      | 'duplicate_title'
      | 'too_long_title'
      | 'too_short_title'
      | 'missing_description'
      | 'duplicate_description'
      | 'too_long_description'
      | 'too_short_description';
    title?: string;
    meta_description?: string;
    length?: number;
    details?: string;
  };
}

export class TitleMetaIssueDetector {
  static async detect(siteId: string): Promise<TitleMetaIssueSignal[]> {
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';

    // Fetch the latest crawled pages for the site within the last 24h
    // We group by url and get the latest title and meta description using argMax
    const query = `
      SELECT 
        url,
        argMax(title, timestamp) as latest_title,
        argMax(meta_description, timestamp) as latest_meta_description
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

      const signals: TitleMetaIssueSignal[] = [];

      // For duplicate checking, we need to map values to their count and list of URLs
      const titleUrlsMap = new Map<string, string[]>();
      const descUrlsMap = new Map<string, string[]>();

      // 1. First pass: analyze lengths, store non-empty values for duplicate checking
      for (const row of rows) {
        const url = row.url.trim();
        const title = (row.latest_title || '').trim();
        const desc = (row.latest_meta_description || '').trim();

        // Check missing/length issues for Title
        if (!title) {
          signals.push({
            detector_type: 'title_meta_issue',
            url,
            metrics: {
              issue_type: 'missing_title',
              details: 'Page is missing a title tag',
            },
          });
        } else {
          const tLen = title.length;
          if (tLen > 60) {
            signals.push({
              detector_type: 'title_meta_issue',
              url,
              metrics: {
                issue_type: 'too_long_title',
                title,
                length: tLen,
                details: `Title tag length (${tLen}) exceeds 60 characters`,
              },
            });
          } else if (tLen < 30) {
            signals.push({
              detector_type: 'title_meta_issue',
              url,
              metrics: {
                issue_type: 'too_short_title',
                title,
                length: tLen,
                details: `Title tag length (${tLen}) is less than 30 characters`,
              },
            });
          }

          // Save to duplicate check map
          const lowerTitle = title.toLowerCase();
          if (!titleUrlsMap.has(lowerTitle)) {
            titleUrlsMap.set(lowerTitle, []);
          }
          titleUrlsMap.get(lowerTitle)!.push(url);
        }

        // Check missing/length issues for Description
        if (!desc) {
          signals.push({
            detector_type: 'title_meta_issue',
            url,
            metrics: {
              issue_type: 'missing_description',
              details: 'Page is missing a meta description',
            },
          });
        } else {
          const dLen = desc.length;
          if (dLen > 160) {
            signals.push({
              detector_type: 'title_meta_issue',
              url,
              metrics: {
                issue_type: 'too_long_description',
                meta_description: desc,
                length: dLen,
                details: `Meta description length (${dLen}) exceeds 160 characters`,
              },
            });
          } else if (dLen < 70) {
            signals.push({
              detector_type: 'title_meta_issue',
              url,
              metrics: {
                issue_type: 'too_short_description',
                meta_description: desc,
                length: dLen,
                details: `Meta description length (${dLen}) is less than 70 characters`,
              },
            });
          }

          // Save to duplicate check map
          const lowerDesc = desc.toLowerCase();
          if (!descUrlsMap.has(lowerDesc)) {
            descUrlsMap.set(lowerDesc, []);
          }
          descUrlsMap.get(lowerDesc)!.push(url);
        }
      }

      // 2. Second pass: check for duplicates
      for (const [titleStr, urls] of titleUrlsMap.entries()) {
        if (urls.length > 1) {
          for (const url of urls) {
            signals.push({
              detector_type: 'title_meta_issue',
              url,
              metrics: {
                issue_type: 'duplicate_title',
                title: titleStr,
                details: `Duplicate title tag shared with: ${urls.filter((u) => u !== url).join(', ')}`,
              },
            });
          }
        }
      }

      for (const [descStr, urls] of descUrlsMap.entries()) {
        if (urls.length > 1) {
          for (const url of urls) {
            signals.push({
              detector_type: 'title_meta_issue',
              url,
              metrics: {
                issue_type: 'duplicate_description',
                meta_description: descStr,
                details: `Duplicate meta description shared with: ${urls.filter((u) => u !== url).join(', ')}`,
              },
            });
          }
        }
      }

      return signals;
    } catch (error) {
      console.error('TitleMetaIssueDetector failed:', error.message);
      return [];
    }
  }
}

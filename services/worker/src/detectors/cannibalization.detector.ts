import { clickhouse } from '@seo/clickhouse';

export interface CannibalizationSignal {
  detector_type: 'cannibalization';
  keyword: string;
  metrics: {
    urls: string[];
    url_count: number;
  };
}

export class CannibalizationDetector {
  static async detect(projectId: string): Promise<CannibalizationSignal[]> {
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';

    // Find queries where multiple URLs for the same project/domain rank within the last 30 days
    const query = `
      SELECT 
        keyword,
        groupArray(distinct url) as urls,
        count(distinct url) as url_count
      FROM ${clickhouseDb}.rank_observations
      WHERE project_id = '${projectId}' AND competitor_domain = '' AND timestamp >= today() - 30
      GROUP BY keyword
      HAVING url_count > 1
      ORDER BY url_count DESC
    `;

    try {
      const resultSet = await clickhouse.query({
        query,
        format: 'JSONEachRow',
      });
      const rows = (await resultSet.json()) as any[];

      return rows.map((row) => ({
        detector_type: 'cannibalization',
        keyword: row.keyword,
        metrics: {
          urls: row.urls,
          url_count: Number(row.url_count),
        },
      }));
    } catch (error) {
      console.error('CannibalizationDetector failed:', error.message);
      return [];
    }
  }
}

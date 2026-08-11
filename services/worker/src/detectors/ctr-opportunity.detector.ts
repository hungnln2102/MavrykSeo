import { clickhouse } from '@seo/clickhouse';

export interface CtrOpportunitySignal {
  detector_type: 'ctr_opportunity';
  keyword: string;
  metrics: {
    impressions: number;
    clicks: number;
    position: number;
    ctr: number;
  };
}

export class CtrOpportunityDetector {
  static async detect(siteId: string): Promise<CtrOpportunitySignal[]> {
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';

    // Find queries on page 1 (position <= 10) with high impressions (> 1000) and low CTR (< 2%)
    const query = `
      SELECT 
        query,
        sum(clicks) as total_clicks,
        sum(impressions) as total_impressions,
        avg(position) as avg_position
      FROM ${clickhouseDb}.gsc_query_daily
      WHERE site_id = '${siteId}' AND date >= today() - 30
      GROUP BY query
      HAVING total_impressions > 1000 AND avg_position <= 10 AND (total_clicks / total_impressions) < 0.02
      ORDER BY total_impressions DESC
    `;

    try {
      const resultSet = await clickhouse.query({
        query,
        format: 'JSONEachRow',
      });
      const rows = (await resultSet.json()) as any[];

      return rows.map((row) => {
        const clicks = Number(row.total_clicks);
        const impressions = Number(row.total_impressions);
        const ctr = impressions > 0 ? clicks / impressions : 0;

        return {
          detector_type: 'ctr_opportunity',
          keyword: row.query,
          metrics: {
            impressions,
            clicks,
            position: Number(row.avg_position),
            ctr,
          },
        };
      });
    } catch (error) {
      console.error('CtrOpportunityDetector failed:', error.message);
      return [];
    }
  }
}

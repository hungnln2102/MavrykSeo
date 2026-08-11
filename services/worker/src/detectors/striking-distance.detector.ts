import { clickhouse } from '@seo/clickhouse';

export interface StrikingDistanceSignal {
  detector_type: 'striking_distance';
  keyword: string;
  metrics: {
    impressions: number;
    clicks: number;
    position: number;
  };
}

export class StrikingDistanceDetector {
  static async detect(siteId: string): Promise<StrikingDistanceSignal[]> {
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';

    // Find queries ranking in striking distance (position 11-20)
    const query = `
      SELECT 
        query,
        sum(clicks) as total_clicks,
        sum(impressions) as total_impressions,
        avg(position) as avg_position
      FROM ${clickhouseDb}.gsc_query_daily
      WHERE site_id = '${siteId}' AND date >= today() - 30
      GROUP BY query
      HAVING avg_position >= 11.0 AND avg_position <= 20.0
      ORDER BY total_impressions DESC
      LIMIT 50
    `;

    try {
      const resultSet = await clickhouse.query({
        query,
        format: 'JSONEachRow',
      });
      const rows = (await resultSet.json()) as any[];

      return rows.map((row) => ({
        detector_type: 'striking_distance',
        keyword: row.query,
        metrics: {
          impressions: Number(row.total_impressions),
          clicks: Number(row.total_clicks),
          position: Number(row.avg_position),
        },
      }));
    } catch (error) {
      console.error('StrikingDistanceDetector failed:', error.message);
      return [];
    }
  }
}

import { clickhouse } from '@seo/clickhouse';

export interface ContentDecaySignal {
  detector_type: 'content_decay';
  url: string;
  metrics: {
    clicks_recent: number;
    clicks_historic: number;
    clicks_drop_percent: number;
  };
}

export class ContentDecayDetector {
  static async detect(siteId: string): Promise<ContentDecaySignal[]> {
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
    
    // Compare last 30 days (recent) vs previous 30 days (historic)
    const query = `
      SELECT 
        page,
        sumIf(clicks, date >= today() - 30) as clicks_recent,
        sumIf(clicks, date >= today() - 60 AND date < today() - 30) as clicks_historic
      FROM ${clickhouseDb}.gsc_page_daily
      WHERE site_id = '${siteId}'
      GROUP BY page
      HAVING clicks_historic > 10 AND clicks_recent < clicks_historic * 0.8
    `;

    try {
      const resultSet = await clickhouse.query({
        query,
        format: 'JSONEachRow',
      });
      const rows = (await resultSet.json()) as any[];

      return rows.map((row) => {
        const drop = ((row.clicks_historic - row.clicks_recent) / row.clicks_historic) * 100;
        return {
          detector_type: 'content_decay',
          url: row.page,
          metrics: {
            clicks_recent: Number(row.clicks_recent),
            clicks_historic: Number(row.clicks_historic),
            clicks_drop_percent: drop,
          },
        };
      });
    } catch (error) {
      console.error('ContentDecayDetector failed:', error.message);
      return [];
    }
  }
}

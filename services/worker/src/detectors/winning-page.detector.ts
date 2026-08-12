import { clickhouse } from '@seo/clickhouse';

export interface WinningPageSignal {
  detector_type: 'winning_page';
  url: string; // The winning page URL
  metrics: {
    clicks_recent: number;
    clicks_historic: number;
    impressions_recent: number;
    impressions_historic: number;
    growth_rate: number;
  };
}

export class WinningPageDetector {
  static async detect(siteId: string): Promise<WinningPageSignal[]> {
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';

    const query = `
      SELECT 
        page,
        sumIf(clicks, date >= today() - 15) as clicks_recent,
        sumIf(clicks, date < today() - 15 AND date >= today() - 30) as clicks_historic,
        sumIf(impressions, date >= today() - 15) as impressions_recent,
        sumIf(impressions, date < today() - 15 AND date >= today() - 30) as impressions_historic
      FROM ${clickhouseDb}.gsc_page_daily
      WHERE site_id = '${siteId}' AND date >= today() - 30
      GROUP BY page
    `;

    try {
      const resultSet = await clickhouse.query({
        query,
        format: 'JSONEachRow',
      });
      const rows = (await resultSet.json()) as any[];
      const signals: WinningPageSignal[] = [];

      for (const row of rows) {
        const pageUrl = row.page.trim();
        const clicksRecent = Number(row.clicks_recent);
        const clicksHistoric = Number(row.clicks_historic);
        const impressionsRecent = Number(row.impressions_recent);
        const impressionsHistoric = Number(row.impressions_historic);

        // Require a minimum of 5 clicks or 100 impressions recently to avoid noise
        if (clicksRecent < 5 && impressionsRecent < 100) {
          continue;
        }

        let clickGrowth = 0;
        if (clicksHistoric > 0) {
          clickGrowth = (clicksRecent - clicksHistoric) / clicksHistoric;
        } else if (clicksRecent >= 5) {
          clickGrowth = 1.0; // 100% growth from 0
        }

        let impressionGrowth = 0;
        if (impressionsHistoric > 0) {
          impressionGrowth = (impressionsRecent - impressionsHistoric) / impressionsHistoric;
        } else if (impressionsRecent >= 100) {
          impressionGrowth = 1.0; // 100% growth from 0
        }

        // Check if either grew by 30% or more
        if (clickGrowth >= 0.3 || impressionGrowth >= 0.3) {
          const maxGrowth = Math.max(clickGrowth, impressionGrowth);
          signals.push({
            detector_type: 'winning_page',
            url: pageUrl,
            metrics: {
              clicks_recent: clicksRecent,
              clicks_historic: clicksHistoric,
              impressions_recent: impressionsRecent,
              impressions_historic: impressionsHistoric,
              growth_rate: Number(maxGrowth.toFixed(4)),
            },
          });
        }
      }

      return signals;
    } catch (error) {
      console.error('WinningPageDetector failed:', error.message);
      return [];
    }
  }
}

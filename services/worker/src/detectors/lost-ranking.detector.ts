import { clickhouse } from '@seo/clickhouse';

export interface LostRankingSignal {
  detector_type: 'lost_ranking';
  keyword: string;
  url: string; // The project's own URL that dropped
  metrics: {
    latest_rank: number;
    previous_rank: number;
    drop_magnitude: number;
  };
}

export class LostRankingDetector {
  static async detect(projectId: string): Promise<LostRankingSignal[]> {
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';

    const query = `
      SELECT 
        keyword,
        argMax(rank, timestamp) as latest_rank,
        argMax(url, timestamp) as latest_url,
        argMin(rank, timestamp) as earliest_rank
      FROM ${clickhouseDb}.rank_observations
      WHERE project_id = '${projectId}' AND competitor_domain = '' AND timestamp >= today() - 30
      GROUP BY keyword
    `;

    try {
      const resultSet = await clickhouse.query({
        query,
        format: 'JSONEachRow',
      });
      const rows = (await resultSet.json()) as any[];
      const signals: LostRankingSignal[] = [];

      for (const row of rows) {
        const keyword = row.keyword.trim();
        const latestRank = Number(row.latest_rank);
        const earliestRank = Number(row.earliest_rank);
        const latestUrl = row.latest_url.trim();

        const dropMagnitude = latestRank - earliestRank;

        // Condition 1: Dropped from Page 1 (rank <= 10) to Page 2+ (rank > 10)
        const droppedFromPage1 = earliestRank <= 10 && latestRank > 10;
        
        // Condition 2: Dropped by 10 or more positions
        const droppedTenOrMore = dropMagnitude >= 10;

        if (droppedFromPage1 || droppedTenOrMore) {
          signals.push({
            detector_type: 'lost_ranking',
            keyword,
            url: latestUrl,
            metrics: {
              latest_rank: latestRank,
              previous_rank: earliestRank,
              drop_magnitude: dropMagnitude > 0 ? dropMagnitude : 0,
            },
          });
        }
      }

      return signals;
    } catch (error) {
      console.error('LostRankingDetector failed:', error.message);
      return [];
    }
  }
}

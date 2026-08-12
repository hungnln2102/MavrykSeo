import { clickhouse } from '@seo/clickhouse';

export interface CompetitorGainSignal {
  detector_type: 'competitor_gain';
  keyword: string;
  url: string; // The competitor's URL
  metrics: {
    competitor_domain: string;
    competitor_rank: number;
    previous_rank: number;
    own_rank: number;
  };
}

export class CompetitorGainDetector {
  static async detect(projectId: string): Promise<CompetitorGainSignal[]> {
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';

    const rankQuery = `
      SELECT 
        keyword,
        competitor_domain,
        argMax(rank, timestamp) as latest_rank,
        argMax(url, timestamp) as latest_url,
        argMin(rank, timestamp) as earliest_rank
      FROM ${clickhouseDb}.rank_observations
      WHERE project_id = '${projectId}' AND timestamp >= today() - 30
      GROUP BY keyword, competitor_domain
    `;

    try {
      const resultSet = await clickhouse.query({
        query: rankQuery,
        format: 'JSONEachRow',
      });
      const rows = (await resultSet.json()) as any[];

      // Organize observations by keyword
      const keywordMap = new Map<string, {
        ownLatestRank?: number;
        competitorRows: Array<{
          competitor_domain: string;
          latest_rank: number;
          earliest_rank: number;
          latest_url: string;
        }>;
      }>();

      for (const row of rows) {
        const kw = row.keyword.trim();
        if (!keywordMap.has(kw)) {
          keywordMap.set(kw, { competitorRows: [] });
        }
        
        const entry = keywordMap.get(kw)!;
        if (row.competitor_domain === '') {
          entry.ownLatestRank = Number(row.latest_rank);
        } else {
          entry.competitorRows.push({
            competitor_domain: row.competitor_domain.trim(),
            latest_rank: Number(row.latest_rank),
            earliest_rank: Number(row.earliest_rank),
            latest_url: row.latest_url.trim(),
          });
        }
      }

      const signals: CompetitorGainSignal[] = [];

      for (const [keyword, entry] of keywordMap.entries()) {
        const ownRank = entry.ownLatestRank ?? 100; // Default to 100 if we don't rank

        for (const comp of entry.competitorRows) {
          // Check if competitor ranks higher than us (lower rank value)
          // AND competitor improved by at least 5 positions
          const rankDifference = comp.earliest_rank - comp.latest_rank;
          if (comp.latest_rank < ownRank && rankDifference >= 5) {
            signals.push({
              detector_type: 'competitor_gain',
              keyword,
              url: comp.latest_url,
              metrics: {
                competitor_domain: comp.competitor_domain,
                competitor_rank: comp.latest_rank,
                previous_rank: comp.earliest_rank,
                own_rank: entry.ownLatestRank ?? 0,
              },
            });
          }
        }
      }

      return signals;
    } catch (error) {
      console.error('CompetitorGainDetector failed:', error.message);
      return [];
    }
  }
}

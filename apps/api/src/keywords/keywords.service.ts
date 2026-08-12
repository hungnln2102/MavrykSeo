import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { db, keywords, projects } from '@seo/db';
import { clickhouse } from '@seo/clickhouse';
import { eq, and } from 'drizzle-orm';
import { Queue } from 'bullmq';

@Injectable()
export class KeywordsService {
  private queue: Queue;
  private collectorApiUrl: string;
  private aiServiceUrl: string;

  constructor() {
    const isMock = process.env.CLICKHOUSE_MOCK === 'true';
    if (!isMock) {
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
      this.queue = new Queue('collector-queue', {
        connection: {
          host: redisHost,
          port: redisPort,
        },
      });
    }

    this.collectorApiUrl = process.env.COLLECTOR_API_URL || 'http://localhost:8082/collect/serp';
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8083';
  }

  async addKeyword(workspaceId: string, projectId: string, keywordStr: string, targetUrl?: string) {
    // 1. Verify project belongs to workspace
    const projectResult = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found');
    }

    const keywordLower = keywordStr.trim().toLowerCase();

    // 2. Insert or get keyword
    // Since unique constraint exists on project_id + keyword, we check first
    const existing = await db
      .select()
      .from(keywords)
      .where(and(eq(keywords.projectId, projectId), eq(keywords.keyword, keywordLower)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const [newKeyword] = await db
      .insert(keywords)
      .values({
        projectId,
        keyword: keywordLower,
        targetUrl: targetUrl || null,
        searchVolume: 0,
        difficulty: 0,
        trackingStatus: 'active',
      })
      .returning();

    // 3. Trigger immediate rank tracking job in BullMQ
    if (this.queue) {
      try {
        await this.queue.add('rank.requested', {
          projectId,
          query: keywordLower,
          numResults: 20,
        });
      } catch (err) {
        console.error('Failed to enqueue rank.requested job:', err.message);
      }
    }

    return newKeyword;
  }

  async getKeywords(workspaceId: string, projectId: string) {
    // Verify project belongs to workspace
    const projectResult = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found');
    }

    const trackedKeywords = await db
      .select()
      .from(keywords)
      .where(eq(keywords.projectId, projectId));

    if (trackedKeywords.length === 0) {
      return [];
    }

    // Retrieve latest rankings from ClickHouse
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
    const query = `
      SELECT 
        keyword,
        argMax(rank, timestamp) as latest_rank,
        argMax(url, timestamp) as url
      FROM ${clickhouseDb}.rank_observations
      WHERE project_id = '${projectId}' AND competitor_domain = ''
      GROUP BY keyword
    `;

    let chRankings: any[] = [];
    try {
      const resultSet = await clickhouse.query({ query, format: 'JSONEachRow' });
      chRankings = (await resultSet.json()) as any[];
    } catch (err) {
      console.error('Failed to query ClickHouse rank observations:', err.message);
    }

    const rankingMap = new Map<string, { rank: number; url: string }>();
    for (const r of chRankings) {
      rankingMap.set(r.keyword.toLowerCase().trim(), {
        rank: Number(r.latest_rank),
        url: r.url,
      });
    }

    // Merge latest rankings into tracked keywords
    return trackedKeywords.map((kw) => {
      const kwNormalized = kw.keyword.toLowerCase().trim();
      const rankData = rankingMap.get(kwNormalized);
      return {
        ...kw,
        latestRank: rankData ? rankData.rank : null,
        detectedUrl: rankData ? rankData.url : null,
      };
    });
  }

  async deleteKeyword(workspaceId: string, projectId: string, id: string) {
    // Verify project belongs to workspace
    const projectResult = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found');
    }

    const deleted = await db
      .delete(keywords)
      .where(and(eq(keywords.id, id), eq(keywords.projectId, projectId)))
      .returning();

    if (deleted.length === 0) {
      throw new NotFoundException('Keyword not found');
    }

    return { success: true };
  }

  async researchKeyword(workspaceId: string, projectId: string, keywordStr: string) {
    // Verify project belongs to workspace
    const projectResult = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found');
    }

    const kwLower = keywordStr.trim().toLowerCase();

    // 1. Call Go Collector to get SERP + Search Volume & CPC
    let serpData: any;
    try {
      const response = await fetch(this.collectorApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: kwLower, numResults: 10 }),
      });
      if (!response.ok) {
        throw new Error(`Collector returned HTTP ${response.status}`);
      }
      serpData = await response.json();
    } catch (err) {
      throw new BadRequestException(`Go Collector request failed: ${err.message}`);
    }

    if (!serpData || !serpData.success) {
      throw new BadRequestException(`Go Collector error: ${serpData?.error || 'Unknown'}`);
    }

    // 2. Call FastAPI AI to get Search Intent
    let intent = 'informational';
    try {
      const response = await fetch(`${this.aiServiceUrl}/analyze/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: [kwLower] }),
      });
      if (response.ok) {
        const intentData = await response.json();
        if (intentData.success && intentData.intents?.length > 0) {
          intent = intentData.intents[0].intent;
        }
      }
    } catch (err) {
      console.warn('FastAPI AI intent classification failed, falling back to default:', err.message);
    }

    return {
      keyword: kwLower,
      searchVolume: serpData.search_volume || 0,
      cpc: serpData.cpc || 0,
      intent,
      results: serpData.results || [],
    };
  }

  async clusterKeywords(workspaceId: string, projectId: string, keywordStrings: string[]) {
    if (!keywordStrings || keywordStrings.length === 0) {
      return [];
    }

    // 1. For each keyword, retrieve SERP results from Go Collector (parallel fetch)
    const serpResults = await Promise.all(
      keywordStrings.map(async (kw) => {
        try {
          const res = await fetch(this.collectorApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: kw.trim().toLowerCase(), numResults: 10 }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              return {
                keyword: kw,
                serp: (data.results || []).map((r: any) => r.url),
              };
            }
          }
        } catch (err) {
          console.error(`Failed to fetch SERP for clustering: ${kw}`, err.message);
        }
        return { keyword: kw, serp: [] };
      }),
    );

    // 2. Send to FastAPI AI for clustering
    try {
      const response = await fetch(`${this.aiServiceUrl}/keywords/cluster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: serpResults }),
      });

      if (!response.ok) {
        throw new Error(`AI Service returned HTTP ${response.status}`);
      }

      const clusterData = await response.json();
      if (clusterData.success) {
        return clusterData.clusters;
      }
    } catch (err) {
      throw new BadRequestException(`Clustering failed in AI Service: ${err.message}`);
    }

    return [];
  }

  async getCompetitorGap(workspaceId: string, projectId: string, competitorsQuery?: string) {
    // 1. Verify project exists
    const projectResult = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found');
    }

    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';

    // Parse specific competitors if passed, otherwise default to all non-empty
    let competitorFilter = "competitor_domain != ''";
    if (competitorsQuery) {
      const domains = competitorsQuery
        .split(',')
        .map((d) => `'${d.trim().toLowerCase().replace('www.', '')}'`)
        .join(',');
      competitorFilter = `competitor_domain IN (${domains})`;
    }

    // Query 1: Competitors latest rankings
    const compQuery = `
      SELECT 
        keyword,
        competitor_domain,
        argMax(rank, timestamp) as latest_rank
      FROM ${clickhouseDb}.rank_observations
      WHERE project_id = '${projectId}' AND ${competitorFilter} AND timestamp >= today() - 30
      GROUP BY keyword, competitor_domain
    `;

    // Query 2: Own latest rankings
    const ownQuery = `
      SELECT 
        keyword,
        argMax(rank, timestamp) as latest_rank
      FROM ${clickhouseDb}.rank_observations
      WHERE project_id = '${projectId}' AND competitor_domain = '' AND timestamp >= today() - 30
      GROUP BY keyword
    `;

    let competitorsRows: any[] = [];
    let ownRows: any[] = [];

    try {
      const [compResultSet, ownResultSet] = await Promise.all([
        clickhouse.query({ query: compQuery, format: 'JSONEachRow' }),
        clickhouse.query({ query: ownQuery, format: 'JSONEachRow' }),
      ]);
      competitorsRows = (await compResultSet.json()) as any[];
      ownRows = (await ownResultSet.json()) as any[];
    } catch (err) {
      console.error('ClickHouse queries failed for Competitor Gap:', err.message);
    }

    const ownRankMap = new Map<string, number>();
    for (const r of ownRows) {
      ownRankMap.set(r.keyword.toLowerCase().trim(), Number(r.latest_rank));
    }

    const gapList: any[] = [];
    for (const r of competitorsRows) {
      const kw = r.keyword.toLowerCase().trim();
      const compRank = Number(r.latest_rank);
      const ownRank = ownRankMap.get(kw);

      // Gap condition: Competitor ranks well (<= 10), but we rank poorly (> 10 or don't rank at all)
      if (compRank <= 10 && (ownRank === undefined || ownRank > 10 || ownRank === 0)) {
        gapList.push({
          keyword: r.keyword,
          competitorDomain: r.competitor_domain,
          competitorRank: compRank,
          ownRank: ownRank !== undefined ? ownRank : null,
        });
      }
    }

    return gapList;
  }

  async getCompetitorRankings(workspaceId: string, projectId: string) {
    const projectResult = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found');
    }

    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
    const query = `
      SELECT 
        toDate(timestamp) as date,
        competitor_domain,
        keyword,
        argMax(rank, timestamp) as rank
      FROM ${clickhouseDb}.rank_observations
      WHERE project_id = '${projectId}' AND timestamp >= today() - 30
      GROUP BY date, competitor_domain, keyword
      ORDER BY date DESC, competitor_domain ASC, rank ASC
    `;

    try {
      const resultSet = await clickhouse.query({ query, format: 'JSONEachRow' });
      const rows = (await resultSet.json()) as any[];
      return rows.map((r: any) => ({
        date: r.date,
        domain: r.competitor_domain === '' ? 'own' : r.competitor_domain,
        keyword: r.keyword,
        rank: Number(r.rank),
      }));
    } catch (err) {
      console.error('Failed to get competitor rankings from ClickHouse:', err.message);
      return [];
    }
  }
}

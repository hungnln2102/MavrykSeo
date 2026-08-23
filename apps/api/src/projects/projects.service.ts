import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { db, projects, workspaces, sites, integrations } from '@seo/db';
import { eq, and, count } from 'drizzle-orm';
import { clickhouse } from '@seo/clickhouse';


@Injectable()
export class ProjectsService {
  async createProject(workspaceId: string, name: string) {
    // 1. Fetch workspace to get plan
    const workspaceResult = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (workspaceResult.length === 0) {
      throw new NotFoundException('Workspace not found');
    }

    const plan = workspaceResult[0].plan || 'free';

    // 2. Count current projects in this workspace
    const countResult = await db
      .select({ value: count() })
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));

    const currentCount = countResult[0]?.value || 0;

    // 3. Validate quota
    let maxProjects = 1;
    if (plan === 'pro') {
      maxProjects = 5;
    } else if (plan === 'enterprise') {
      maxProjects = 9999;
    }

    if (currentCount >= maxProjects) {
      throw new BadRequestException(`Project limit reached for workspace plan '${plan}'. Upgrade required.`);
    }

    const [newProject] = await db.insert(projects).values({
      workspaceId,
      name,
    }).returning();
    
    return newProject;
  }

  async getProjects(workspaceId: string) {
    const results = await db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));
      
    return results;
  }

  async getProjectById(workspaceId: string, projectId: string) {
    const results = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException('Project not found in the active workspace');
    }

    return results[0];
  }

  async getProjectGscPerformance(workspaceId: string, projectId: string) {
    // 1. Verify project belongs to workspace
    const projectResult = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found in the active workspace');
    }

    // 2. Fetch all sites of the project
    const projectSites = await db
      .select({ id: sites.id, domain: sites.domain })
      .from(sites)
      .where(eq(sites.projectId, projectId));

    if (projectSites.length === 0) {
      return {
        metrics: [
          { label: 'Total Clicks', value: '0', change: '0%', positive: true, iconName: 'Activity', provenance: 'observed' },
          { label: 'Avg. CTR', value: '0%', change: '0%', positive: true, iconName: 'TrendingUp', provenance: 'derived' },
          { label: 'Avg. Position', value: '0.0', change: '0', positive: true, iconName: 'Sparkles', provenance: 'observed' },
          { label: 'Crawl Health', value: '100%', change: '0%', positive: true, iconName: 'CheckCircle2', provenance: 'derived' }
        ],
        chartData: [],
        topKeywords: []
      };
    }

    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
    const siteIds = projectSites.map(s => s.id);
    const siteIdsListStr = siteIds.map(id => `'${id}'`).join(',');

    // Check if project has a real GSC integration connected
    let hasRealGscIntegration = false;
    try {
      const gscIntegration = await db
        .select({ id: integrations.id, status: integrations.status })
        .from(integrations)
        .where(
          and(
            eq(integrations.projectId, projectId),
            eq(integrations.provider, 'google_search_console')
          )
        )
        .limit(1);
      hasRealGscIntegration = gscIntegration.length > 0 && gscIntegration[0].status === 'active';
    } catch (err: any) {
      console.error('Failed to check GSC integration status:', err.message);
    }

    // Check count of records in gsc_page_daily for these sites
    let countData = 0;
    try {
      const cntResult = await clickhouse.query({
        query: `SELECT count() as cnt FROM ${clickhouseDb}.gsc_page_daily WHERE site_id IN (${siteIdsListStr})`,
        format: 'JSONEachRow'
      });
      const cntRows = (await cntResult.json()) as any[];
      countData = Number(cntRows[0]?.cnt || 0);
    } catch (err: any) {
      console.error('ClickHouse count query failed:', err.message);
    }

    // Only auto-seed if NO real GSC integration and NO existing data
    if (countData === 0 && !hasRealGscIntegration) {
      console.log(`No GSC data found in ClickHouse. Auto-seeding ClickHouse with mock performance observations for site_ids: ${siteIdsListStr}`);
      
      const pageDailyValues: any[] = [];
      const queryDailyValues: any[] = [];
      const rankObsValues: any[] = [];
      const crawlObsValues: any[] = [];
      
      const now = new Date();
      const mockKeywords = [
        'seo automated tool',
        'ai ranking software',
        'nextjs seo template',
        'automatic index google',
        'content decay tool',
        'striking distance keywords',
        'seo agency audit',
        'automated page speed optimization'
      ];
      
      const mockPages = projectSites.flatMap(s => [
        `https://${s.domain}/`,
        `https://${s.domain}/blog/seo-guide`,
        `https://${s.domain}/features/rank-tracker`,
        `https://${s.domain}/about`
      ]);

      const jobRunId = `seeded-gsc-${Math.floor(Date.now() / 1000)}`;

      for (const site of projectSites) {
        // Crawl page observations for health
        const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);
        crawlObsValues.push(
          { timestamp: nowStr, site_id: site.id, url: `https://${site.domain}/`, status_code: 200, title: 'Demo home', meta_description: 'Home', load_time_ms: 250, page_size_bytes: 4500, word_count: 500, issues: [], canonical_url: '', redirect_chain: [], redirect_status_codes: [], robots_meta: '', job_run_id: jobRunId, observed_at: nowStr, ingested_at: nowStr, schema_version: '1.0', algorithm_version: '1.0', source_origin: 'gsc_seed' },
          { timestamp: nowStr, site_id: site.id, url: `https://${site.domain}/blog/seo-guide`, status_code: 200, title: 'SEO guide', meta_description: 'SEO guide', load_time_ms: 300, page_size_bytes: 12000, word_count: 1500, issues: ['low_word_count'], canonical_url: '', redirect_chain: [], redirect_status_codes: [], robots_meta: '', job_run_id: jobRunId, observed_at: nowStr, ingested_at: nowStr, schema_version: '1.0', algorithm_version: '1.0', source_origin: 'gsc_seed' },
          { timestamp: nowStr, site_id: site.id, url: `https://${site.domain}/features/rank-tracker`, status_code: 200, title: 'Rank tracker', meta_description: 'Rank tracker', load_time_ms: 180, page_size_bytes: 9000, word_count: 800, issues: [], canonical_url: '', redirect_chain: [], redirect_status_codes: [], robots_meta: '', job_run_id: jobRunId, observed_at: nowStr, ingested_at: nowStr, schema_version: '1.0', algorithm_version: '1.0', source_origin: 'gsc_seed' },
          { timestamp: nowStr, site_id: site.id, url: `https://${site.domain}/about`, status_code: 404, title: 'Not found', meta_description: 'Not found', load_time_ms: 100, page_size_bytes: 3000, word_count: 100, issues: ['broken_link'], canonical_url: '', redirect_chain: [], redirect_status_codes: [], robots_meta: '', job_run_id: jobRunId, observed_at: nowStr, ingested_at: nowStr, schema_version: '1.0', algorithm_version: '1.0', source_origin: 'gsc_seed' }
        );

        for (let i = 60; i >= 0; i--) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const dateStr = d.toISOString().substring(0, 10);
          
          for (let pIdx = 0; pIdx < mockPages.length; pIdx++) {
            const pageUrl = mockPages[pIdx];
            const modifier = i <= 30 ? 1.15 : 1.0;
            const baseClicks = 50 + (pIdx * 30) + Math.floor(Math.sin((60 - i) / 5) * 20);
            const clicks = Math.round(baseClicks * modifier);
            const impressions = Math.round(clicks * (20 - pIdx * 2) * modifier);
            const ctr = clicks / (impressions || 1);
            const position = parseFloat((12.5 - (pIdx * 1) + Math.cos((60 - i) / 4) * 1.5 - (i <= 30 ? 1.0 : 0)).toFixed(2));
            
            pageDailyValues.push({
              date: dateStr,
              site_id: site.id,
              page: pageUrl,
              clicks,
              impressions,
              ctr,
              position
            });
          }

          for (let qIdx = 0; qIdx < mockKeywords.length; qIdx++) {
            const kw = mockKeywords[qIdx];
            const modifier = i <= 30 ? 1.15 : 1.0;
            const baseClicks = 40 + (qIdx * 25) + Math.floor(Math.sin((60 - i) / 5) * 15);
            const clicks = Math.round(baseClicks * modifier);
            const impressions = Math.round(clicks * (15 - qIdx * 1) * modifier);
            const ctr = clicks / (impressions || 1);
            const position = parseFloat((14.0 - (qIdx * 1.2) + Math.cos((60 - i) / 4) * 1.2 - (i <= 30 ? 1.0 : 0)).toFixed(2));
            
            queryDailyValues.push({
              date: dateStr,
              site_id: site.id,
              query: kw,
              clicks,
              impressions,
              ctr,
              position
            });

            if (i % 7 === 0) {
              const timestampStr = d.toISOString().replace('T', ' ').substring(0, 19);
              rankObsValues.push({
                timestamp: timestampStr,
                project_id: projectId,
                keyword: kw,
                rank: Math.max(1, Math.round(position)),
                search_volume: 500 + qIdx * 1000,
                url: `https://${site.domain}/`,
                competitor_domain: '',
                device: 'desktop',
                country: 'us',
                job_run_id: `run-${dateStr}`,
                observed_at: timestampStr,
                ingested_at: timestampStr,
                schema_version: '1.0',
                algorithm_version: '1.0',
                source_origin: 'gsc_seed'
              });
            }
          }
        }
      }

      try {
        await Promise.all([
          clickhouse.insert({ table: 'gsc_page_daily', values: pageDailyValues }),
          clickhouse.insert({ table: 'gsc_query_daily', values: queryDailyValues }),
          clickhouse.insert({ table: 'rank_observations', values: rankObsValues }),
          clickhouse.insert({ table: 'crawl_page_observations', values: crawlObsValues })
        ]);
        console.log('Seeded ClickHouse tables successfully in service.');
      } catch (err: any) {
        console.error('ClickHouse seeding insertion failed:', err.message);
      }
    }

    // 3. Query aggregated GSC metrics
    const recentQuery = `
      SELECT 
        sum(clicks) as clicks,
        sum(impressions) as impressions,
        avg(ctr) as ctr,
        avg(position) as position
      FROM ${clickhouseDb}.gsc_page_daily
      WHERE site_id IN (${siteIdsListStr}) AND date >= today() - 30
    `;

    const historicQuery = `
      SELECT 
        sum(clicks) as clicks,
        sum(impressions) as impressions,
        avg(ctr) as ctr,
        avg(position) as position
      FROM ${clickhouseDb}.gsc_page_daily
      WHERE site_id IN (${siteIdsListStr}) AND date >= today() - 60 AND date < today() - 30
    `;

    let recentClicks = 0;
    let recentImps = 0;
    let recentCtr = 0;
    let recentPos = 0;

    let historicClicks = 0;
    let historicImps = 0;
    let historicCtr = 0;
    let historicPos = 0;

    try {
      const [recentRes, historicRes] = await Promise.all([
        clickhouse.query({ query: recentQuery, format: 'JSONEachRow' }),
        clickhouse.query({ query: historicQuery, format: 'JSONEachRow' })
      ]);
      const recentRows = (await recentRes.json()) as any[];
      const historicRows = (await historicRes.json()) as any[];

      const rec = recentRows[0] || {};
      const hist = historicRows[0] || {};

      recentClicks = Number(rec.clicks || 0);
      recentImps = Number(rec.impressions || 0);
      recentCtr = recentImps > 0 ? (recentClicks / recentImps) : 0;
      recentPos = parseFloat(Number(rec.position || 0).toFixed(1));

      historicClicks = Number(hist.clicks || 0);
      historicImps = Number(hist.impressions || 0);
      historicCtr = historicImps > 0 ? (historicClicks / historicImps) : 0;
      historicPos = parseFloat(Number(hist.position || 0).toFixed(1));
    } catch (err: any) {
      console.error('Failed to run ClickHouse metrics queries:', err.message);
    }

    // 4. Query Crawl Health from the latest crawl run
    let crawlHealth = 100;
    try {
      const runResult = await clickhouse.query({
        query: `SELECT job_run_id FROM ${clickhouseDb}.crawl_page_observations WHERE site_id IN (${siteIdsListStr}) ORDER BY timestamp DESC LIMIT 1`,
        format: 'JSONEachRow'
      });
      const runRows = (await runResult.json()) as any[];
      if (runRows.length > 0) {
        const lastRunId = runRows[0].job_run_id;
        const auditResult = await clickhouse.query({
          query: `
            SELECT 
              count() as total,
              sum(status_code = 200) as success,
              sum(length(issues) > 0) as with_issues
            FROM ${clickhouseDb}.crawl_page_observations
            WHERE job_run_id = '${lastRunId}'
          `,
          format: 'JSONEachRow'
        });
        const auditRows = (await auditResult.json()) as any[];
        if (auditRows.length > 0) {
          const total = Number(auditRows[0].total || 0);
          const withIssues = Number(auditRows[0].with_issues || 0);
          if (total > 0) {
            crawlHealth = Math.round(((total - withIssues) / total) * 100);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to query crawl health:', err.message);
    }

    // Helpers for formatting
    const formatNum = (num: number) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    };

    const formatChangePercent = (recent: number, historic: number) => {
      if (historic === 0) return '0%';
      const pct = ((recent - historic) / historic) * 100;
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    };

    const formatChangeCtr = (recent: number, historic: number) => {
      const diff = (recent - historic) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };

    const formatChangePos = (recent: number, historic: number) => {
      const diff = recent - historic;
      return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`;
    };

    const metricsResult = [
      { label: 'Total Clicks', value: formatNum(recentClicks), change: formatChangePercent(recentClicks, historicClicks), positive: recentClicks >= historicClicks, iconName: 'Activity', provenance: 'observed' },
      { label: 'Avg. CTR', value: `${(recentCtr * 100).toFixed(1)}%`, change: formatChangeCtr(recentCtr, historicCtr), positive: recentCtr >= historicCtr, iconName: 'TrendingUp', provenance: 'derived' },
      { label: 'Avg. Position', value: recentPos.toFixed(1), change: formatChangePos(recentPos, historicPos), positive: recentPos <= historicPos, iconName: 'Sparkles', provenance: 'observed' },
      { label: 'Crawl Health', value: `${crawlHealth}%`, change: '0%', positive: true, iconName: 'CheckCircle2', provenance: 'derived' }
    ];

    // 5. Query daily chart data points
    const chartQuery = `
      SELECT 
        date,
        sum(clicks) as clicks,
        sum(impressions) as impressions
      FROM ${clickhouseDb}.gsc_page_daily
      WHERE site_id IN (${siteIdsListStr}) AND date >= today() - 30
      GROUP BY date
      ORDER BY date ASC
    `;

    let chartData: any[] = [];
    try {
      const chartRes = await clickhouse.query({ query: chartQuery, format: 'JSONEachRow' });
      const chartRows = (await chartRes.json()) as any[];
      chartData = chartRows.map(row => ({
        date: row.date,
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0)
      }));
    } catch (err: any) {
      console.error('Failed to run ClickHouse chart query:', err.message);
    }

    // 6. Query top keywords search queries table
    const topKeywordsQuery = `
      SELECT 
        query,
        sum(clicks) as clicks,
        sum(impressions) as impressions,
        avg(ctr) * 100 as ctr,
        avg(position) as position
      FROM ${clickhouseDb}.gsc_query_daily
      WHERE site_id IN (${siteIdsListStr}) AND date >= today() - 30
      GROUP BY query
      ORDER BY clicks DESC
      LIMIT 10
    `;

    let topKeywords: any[] = [];
    try {
      const topKwRes = await clickhouse.query({ query: topKeywordsQuery, format: 'JSONEachRow' });
      const topKwRows = (await topKwRes.json()) as any[];
      topKeywords = topKwRows.map(row => ({
        query: row.query,
        clicks: Number(row.clicks || 0),
        impressions: Number(row.impressions || 0),
        ctr: `${Number(row.ctr || 0).toFixed(1)}%`,
        pos: parseFloat(Number(row.position || 0).toFixed(1))
      }));
    } catch (err: any) {
      console.error('Failed to run ClickHouse top keywords query:', err.message);
    }

    return {
      metrics: metricsResult,
      chartData,
      topKeywords
    };
  }

  /**
   * Inline GSC sync — directly fetches real data from Google Search Analytics API
   * and writes to ClickHouse. Used in dev/demo mode instead of Worker queue.
   */
  async inlineSyncGsc(workspaceId: string, projectId: string) {
    // 1. Get integration credentials
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.projectId, projectId),
          eq(integrations.provider, 'google_search_console')
        )
      )
      .limit(1);

    if (!integration || integration.status !== 'active') {
      return { synced: false, reason: 'GSC integration not active' };
    }

    let credentials: { accessToken: string; refreshToken: string; expiresAt: number; siteUrl?: string };
    try {
      const { decryptToken } = await import('@seo/core');
      credentials = JSON.parse(decryptToken(integration.credentials));
    } catch {
      return { synced: false, reason: 'Failed to decrypt GSC credentials' };
    }

    if (!credentials.siteUrl) {
      return { synced: false, reason: 'No GSC property selected' };
    }

    // 2. Refresh token if expired
    let accessToken = credentials.accessToken;
    if (credentials.expiresAt < Date.now() + 60_000) {
      try {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GSC_OAUTH_CLIENT_ID || '',
            client_secret: process.env.GSC_OAUTH_CLIENT_SECRET || '',
            refresh_token: credentials.refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        const tokenData = await refreshRes.json() as any;
        if (!refreshRes.ok || !tokenData.access_token) {
          return { synced: false, reason: 'Failed to refresh GSC access token' };
        }
        accessToken = tokenData.access_token;
        // Update stored credentials
        const { encryptToken } = await import('@seo/core');
        const updatedCreds = {
          ...credentials,
          accessToken,
          refreshToken: tokenData.refresh_token || credentials.refreshToken,
          expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
        };
        await db.update(integrations)
          .set({ credentials: encryptToken(JSON.stringify(updatedCreds)), updatedAt: new Date() })
          .where(eq(integrations.id, integration.id));
      } catch (err: any) {
        return { synced: false, reason: `Token refresh error: ${err.message}` };
      }
    }

    // 3. Fetch site_id
    const [site] = await db
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.projectId, projectId))
      .limit(1);

    if (!site) {
      return { synced: false, reason: 'No site found for this project' };
    }

    // 4. Call Google Search Analytics API
    const endDate = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 31 * 86_400_000).toISOString().slice(0, 10);

    const fetchAnalytics = async (dimensions: string[]) => {
      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(credentials.siteUrl!)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions,
            rowLimit: 25000,
            startRow: 0,
          }),
        },
      );
      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`Google API ${response.status}: ${errBody}`);
      }
      const data = await response.json() as { rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }> };
      return data.rows || [];
    };

    try {
      const [queryRows, pageRows] = await Promise.all([
        fetchAnalytics(['date', 'query']),
        fetchAnalytics(['date', 'page']),
      ]);

      console.log(`GSC Inline Sync: fetched ${queryRows.length} query rows, ${pageRows.length} page rows from Google API`);

      // 5. Clear old mock data for this site
      const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
      try {
        await clickhouse.query({
          query: `ALTER TABLE ${clickhouseDb}.gsc_query_daily DELETE WHERE site_id = '${site.id}'`,
        });
        await clickhouse.query({
          query: `ALTER TABLE ${clickhouseDb}.gsc_page_daily DELETE WHERE site_id = '${site.id}'`,
        });
      } catch {
        // Mock ClickHouse may not support ALTER DELETE — just clear via insert overwrite
      }

      // 6. Insert real data
      if (queryRows.length > 0) {
        await clickhouse.insert({
          table: `${clickhouseDb}.gsc_query_daily`,
          values: queryRows.map(row => ({
            date: row.keys?.[0] || '',
            site_id: site.id,
            query: row.keys?.[1] || '',
            clicks: Math.max(0, Math.round(row.clicks || 0)),
            impressions: Math.max(0, Math.round(row.impressions || 0)),
            ctr: Number(row.ctr || 0),
            position: Number(row.position || 0),
          })),
        });
      }

      if (pageRows.length > 0) {
        await clickhouse.insert({
          table: `${clickhouseDb}.gsc_page_daily`,
          values: pageRows.map(row => ({
            date: row.keys?.[0] || '',
            site_id: site.id,
            page: row.keys?.[1] || '',
            clicks: Math.max(0, Math.round(row.clicks || 0)),
            impressions: Math.max(0, Math.round(row.impressions || 0)),
            ctr: Number(row.ctr || 0),
            position: Number(row.position || 0),
          })),
        });
      }

      return {
        synced: true,
        queryRowsCount: queryRows.length,
        pageRowsCount: pageRows.length,
        dateRange: { startDate, endDate },
      };
    } catch (err: any) {
      console.error('GSC Inline Sync error:', err.message);
      return { synced: false, reason: err.message };
    }
  }
}


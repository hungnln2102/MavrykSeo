process.env.CLICKHOUSE_USER = process.env.CLICKHOUSE_USER || 'seo';
process.env.CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD || 'seo';
process.env.CLICKHOUSE_DB = process.env.CLICKHOUSE_DB || 'seo_platform';

const { db, sites, projects, workspaces, users, recommendations, memberships } = require('@seo/db');
const { clickhouse } = require('@seo/clickhouse');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const Readable = require('stream').Readable;

// Global S3 Mock
S3Client.prototype.send = async function (command, options) {
  if (command instanceof GetObjectCommand) {
    const key = command.input.Key;
    console.log(`[Mock S3 GetObject]: Key: ${key}`);
    let html = '<html><body>Default content</body></html>';
    
    const hashAbout = crypto.createHash('sha256').update('https://agency.mavryk.io/about').digest('hex');
    const hashTips = crypto.createHash('sha256').update('https://agency.mavryk.io/blog/seo-tips').digest('hex');
    
    if (key.includes(hashAbout)) {
      html = '<html><body>About page. We have some great SEO tips here! Please read them.</body></html>';
    } else if (key.includes(hashTips)) {
      html = '<html><body>SEO Tips page. Deep content about SEO tips.</body></html>';
    }
    
    const s = new Readable();
    s.push(html);
    s.push(null);
    return {
      Body: s
    };
  }
  return { success: true };
};

// Mock ClickHouse client since Docker/ClickHouse is not installed locally
const mockClickhouseData = {};

clickhouse.command = async (params) => {
  console.log(`[Mock ClickHouse Command]: ${params.query}`);
  return { success: true };
};

clickhouse.insert = async (params) => {
  console.log(`[Mock ClickHouse Insert]: Table "${params.table}" with ${params.values.length} rows`);
  mockClickhouseData[params.table] = params.values;
  return { success: true };
};

clickhouse.query = async (params) => {
  console.log(`[Mock ClickHouse Query]: ${params.query}`);
  const q = params.query.toLowerCase();
  let rows = [];

  if (q.includes('gsc_page_daily')) {
    if (q.includes('sumif(clicks, date >= today() - 15)')) {
      // WinningPageDetector query
      rows = [
        {
          page: 'https://agency.mavryk.io/blog/winning-seo-tricks',
          clicks_recent: 20,
          clicks_historic: 5,
          impressions_recent: 500,
          impressions_historic: 100
        }
      ];
    } else {
      // Content Decay AND GSC traffic for Indexability
      rows = [
        {
          page: 'https://agency.mavryk.io/blog/seo-tips',
          clicks_recent: 5,
          clicks_historic: 50,
          total_clicks: 5,
          total_impressions: 100
        },
        {
          page: 'https://agency.mavryk.io/traffic-robots-blocked',
          clicks_recent: 0,
          clicks_historic: 0,
          total_clicks: 12,
          total_impressions: 240
        },
        {
          page: 'https://agency.mavryk.io/traffic-noindex',
          clicks_recent: 0,
          clicks_historic: 0,
          total_clicks: 8,
          total_impressions: 150
        }
      ];
    }
  } else if (q.includes('gsc_query_daily')) {
    // Striking Distance and CTR Opportunity
    // We return both to satisfy both detectors
    rows = [
      {
        query: 'local seo audit tool',
        total_clicks: 0,
        total_impressions: 450,
        avg_position: 14.5
      },
      {
        query: 'best enterprise seo agency',
        total_clicks: 2,
        total_impressions: 2000,
        avg_position: 2.3
      }
    ];
  } else if (q.includes('rank_observations')) {
    if (q.includes('group by keyword, competitor_domain')) {
      // CompetitorGainDetector query
      rows = [
        {
          keyword: 'competitor keyword',
          competitor_domain: '',
          latest_rank: 15,
          latest_url: 'https://agency.mavryk.io/competitor-kw-page',
          earliest_rank: 15
        },
        {
          keyword: 'competitor keyword',
          competitor_domain: 'competitor.com',
          latest_rank: 8,
          latest_url: 'https://competitor.com/page',
          earliest_rank: 20
        }
      ];
    } else if (q.includes('latest_rank <= 20')) {
      // InternalLinkOpportunityDetector query
      rows = [
        {
          keyword: 'SEO tips',
          target_url: 'https://agency.mavryk.io/blog/seo-tips',
          latest_rank: 5
        }
      ];
    } else if (q.includes('competitor_domain = \'\'') && q.includes('group by keyword')) {
      // LostRankingDetector query
      rows = [
        {
          keyword: 'lost keyword',
          latest_rank: 18,
          latest_url: 'https://agency.mavryk.io/lost-kw-page',
          earliest_rank: 5
        }
      ];
    } else {
      // Cannibalization
      rows = [{
        keyword: 'competitor analysis strategy',
        urls: ['https://agency.mavryk.io/blog/competitor-analysis-1', 'https://agency.mavryk.io/blog/competitor-analysis-2'],
        url_count: 2
      }];
    }
  } else if (q.includes('crawl_page_observations')) {
    // Orphan Page, Title/Meta, Redirect, and Canonical Issues
    const todayStr = new Date().toISOString().slice(0, 10);
    rows = [
      { url: 'https://agency.mavryk.io/', latest_title: 'Mavryk Agency - Best Enterprise SEO Platform', latest_meta_description: 'Mavryk is the leading enterprise agency and SEO platform for content optimization.', latest_status_code: 200, latest_issues: [], latest_canonical_url: 'https://agency.mavryk.io/', timestamp: todayStr },
      { url: 'https://agency.mavryk.io/orphan-contacts', latest_title: 'Contacts Us', latest_meta_description: 'Short desc', latest_status_code: 200, latest_issues: [], latest_canonical_url: 'https://agency.mavryk.io/orphan-contacts', timestamp: todayStr },
      { url: 'https://agency.mavryk.io/about', latest_title: '', latest_meta_description: 'This is a duplicate description.', latest_status_code: 200, latest_issues: [], latest_canonical_url: 'https://agency.mavryk.io/about', timestamp: todayStr },
      { url: 'https://agency.mavryk.io/services', latest_title: 'Services', latest_meta_description: 'This is a duplicate description.', latest_status_code: 200, latest_issues: [], latest_canonical_url: 'https://agency.mavryk.io/services', timestamp: todayStr },
      
      // Target for Internal Link Opportunity
      { url: 'https://agency.mavryk.io/blog/seo-tips', latest_title: 'SEO Tips', latest_meta_description: 'Best tips', latest_status_code: 200, latest_issues: [], latest_canonical_url: 'https://agency.mavryk.io/blog/seo-tips', timestamp: todayStr },
      
      // Redirects
      { url: 'https://agency.mavryk.io/loop-redirect', latest_title: '', latest_meta_description: '', latest_status_code: 310, latest_issues: ['redirect_loop'], latest_canonical_url: '', timestamp: todayStr },
      { url: 'https://agency.mavryk.io/chain-redirect', latest_title: '', latest_meta_description: '', latest_status_code: 301, latest_issues: ['multiple_redirects', 'temporary_redirect'], latest_canonical_url: '', timestamp: todayStr },
      { url: 'https://agency.mavryk.io/temp-redirect', latest_title: '', latest_meta_description: '', latest_status_code: 302, latest_issues: ['temporary_redirect'], latest_canonical_url: '', timestamp: todayStr },
      
      // Canonical issues
      { url: 'https://agency.mavryk.io/missing-canonical', latest_title: 'Missing Canonical Page', latest_meta_description: 'Desc', latest_status_code: 200, latest_issues: ['missing_canonical'], latest_canonical_url: '', timestamp: todayStr },
      { url: 'https://agency.mavryk.io/mismatch-canonical', latest_title: 'Mismatch Canonical Page', latest_meta_description: 'Desc', latest_status_code: 200, latest_issues: ['canonical_domain_mismatch'], latest_canonical_url: 'https://otherdomain.com/mismatch-canonical', timestamp: todayStr },
      { url: 'https://agency.mavryk.io/broken-canonical-source', latest_title: 'Broken Canonical Source', latest_meta_description: 'Desc', latest_status_code: 200, latest_issues: [], latest_canonical_url: 'https://agency.mavryk.io/broken-canonical-target', timestamp: todayStr },
      { url: 'https://agency.mavryk.io/broken-canonical-target', latest_title: 'Broken Canonical Target', latest_meta_description: 'Desc', latest_status_code: 404, latest_issues: ['error_status_code'], latest_canonical_url: 'https://agency.mavryk.io/broken-canonical-target', timestamp: todayStr },
      { url: 'https://agency.mavryk.io/redirect-canonical-source', latest_title: 'Redirect Canonical Source', latest_meta_description: 'Desc', latest_status_code: 200, latest_issues: [], latest_canonical_url: 'https://agency.mavryk.io/redirect-canonical-target', timestamp: todayStr },
      { url: 'https://agency.mavryk.io/redirect-canonical-target', latest_title: 'Redirect Canonical Target', latest_meta_description: 'Desc', latest_status_code: 301, latest_issues: ['temporary_redirect'], latest_canonical_url: 'https://agency.mavryk.io/redirect-canonical-target', timestamp: todayStr },
      { url: 'https://agency.mavryk.io/loop-canonical-a', latest_title: 'Loop Canonical A', latest_meta_description: 'Desc', latest_status_code: 200, latest_issues: [], latest_canonical_url: 'https://agency.mavryk.io/loop-canonical-b', timestamp: todayStr },
      { url: 'https://agency.mavryk.io/loop-canonical-b', latest_title: 'Loop Canonical B', latest_meta_description: 'Desc', latest_status_code: 200, latest_issues: [], latest_canonical_url: 'https://agency.mavryk.io/loop-canonical-a', timestamp: todayStr },
      
      // Indexability issues
      // Case 1: robots_blocked with traffic
      { url: 'https://agency.mavryk.io/traffic-robots-blocked', latest_title: '', latest_meta_description: '', latest_status_code: 403, latest_issues: ['robots_blocked'], latest_canonical_url: '', timestamp: todayStr },
      // Case 2: robots_blocked in sitemap (no traffic)
      { url: 'https://agency.mavryk.io/sitemap-only-robots-blocked', latest_title: '', latest_meta_description: '', latest_status_code: 403, latest_issues: ['robots_blocked'], latest_canonical_url: '', timestamp: todayStr },
      // Case 3: noindex with traffic
      { url: 'https://agency.mavryk.io/traffic-noindex', latest_title: 'Noindex page', latest_meta_description: 'Desc', latest_status_code: 200, latest_issues: ['noindex'], latest_canonical_url: 'https://agency.mavryk.io/traffic-noindex', timestamp: todayStr },
      // Case 4: noindex in sitemap (no traffic)
      { url: 'https://agency.mavryk.io/sitemap-only-noindex', latest_title: 'Noindex page 2', latest_meta_description: 'Desc 2', latest_status_code: 200, latest_issues: ['noindex'], latest_canonical_url: 'https://agency.mavryk.io/sitemap-only-noindex', timestamp: todayStr }
    ];
  }

  console.log(`[Mock ClickHouse Query Result]: Returning ${rows.length} rows`);
  return {
    json: async () => rows
  };
};
const { eq } = require('drizzle-orm');
const { spawn } = require('child_process');
const axios = require('axios');
const originalPost = axios.post;
axios.post = async (url, data, config) => {
  if (url.includes('/sitemap')) {
    console.log(`[Mock Axios Post Sitemap]: ${url} with data:`, data);
    return {
      data: {
        success: true,
        urls: [
          'https://agency.mavryk.io/',
          'https://agency.mavryk.io/sitemap-only-robots-blocked',
          'https://agency.mavryk.io/sitemap-only-noindex',
        ]
      }
    };
  }
  return originalPost(url, data, config);
};

const { DetectorProcessor } = require('./dist/detector.processor');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('=== Starting E2E Verification for AI Service & SEO Detectors ===');

  // 1. Start Python FastAPI Service in background
  console.log('Starting Python FastAPI AI Service on port 8083...');
  const path = require('path');
  const pythonBin = process.platform === 'win32' 
    ? path.join(__dirname, '../ai/.venv/Scripts/python.exe') 
    : path.join(__dirname, '../ai/.venv/bin/python');
  const pythonProc = spawn(pythonBin, ['-u', 'main.py'], {
    cwd: path.join(__dirname, '../ai'),
    env: { ...process.env, OPENAI_API_KEY: '' } // Force mock fallback for local deterministic test
  });

  pythonProc.stdout.on('data', (data) => console.log(`[FastAPI STDOUT]: ${data.toString().trim()}`));
  pythonProc.stderr.on('data', (data) => console.error(`[FastAPI STDERR]: ${data.toString().trim()}`));

  // Check health with retries
  let retries = 10;
  let healthy = false;
  while (retries > 0 && !healthy) {
    await sleep(1000);
    try {
      const health = await axios.get('http://localhost:8083/health');
      console.log('FastAPI Health check status:', health.data);
      healthy = true;
    } catch (err) {
      console.log(`Waiting for FastAPI to start... (${retries} retries left)`);
      retries--;
    }
  }

  if (!healthy) {
    console.error('FastAPI Health check failed after all retries.');
    pythonProc.kill();
    process.exit(1);
  }

  // 2. Ensure mock site & project exist in PostgreSQL
  console.log('Seeding PostgreSQL mock data...');
  let user = await db.query.users.findFirst();
  if (!user) {
    const [newUser] = await db.insert(users).values({
      email: 'test@mavryk.io',
      name: 'Test Admin',
    }).returning();
    user = newUser;
  }

  let workspace = await db.query.workspaces.findFirst();
  if (!workspace) {
    const [newWs] = await db.insert(workspaces).values({
      name: 'Test Workspace',
      slug: 'test-workspace',
    }).returning();
    workspace = newWs;
  }

  // Ensure membership exists
  let membership = await db.query.memberships.findFirst({
    where: (m, { and, eq }) => and(eq(m.userId, user.id), eq(m.workspaceId, workspace.id))
  });
  if (!membership) {
    await db.insert(memberships).values({
      userId: user.id,
      workspaceId: workspace.id,
      role: 'owner',
    });
    console.log('Seeded PostgreSQL workspace membership.');
  }

  let project = await db.query.projects.findFirst();
  if (!project) {
    const [newProj] = await db.insert(projects).values({
      workspaceId: workspace.id,
      name: 'Test SEO Project',
    }).returning();
    project = newProj;
  }

  let site = await db.query.sites.findFirst({
    where: eq(sites.projectId, project.id)
  });
  if (!site) {
    const [newSite] = await db.insert(sites).values({
      projectId: project.id,
      domain: 'agency.mavryk.io',
      name: 'Mavryk Agency',
    }).returning();
    site = newSite;
  }

  const siteId = site.id;
  const projectId = project.id;
  console.log(`Using Site ID: ${siteId}, Project ID: ${projectId}, Domain: ${site.domain}`);

  // 3. Clear & Seed ClickHouse historical observations
  console.log('Seeding ClickHouse historical tables...');
  const chDb = process.env.CLICKHOUSE_DB || 'seo_platform';
  
  // Clear old test observations
  await clickhouse.command({ query: `ALTER TABLE ${chDb}.gsc_page_daily DELETE WHERE site_id = '${siteId}'` });
  await clickhouse.command({ query: `ALTER TABLE ${chDb}.gsc_query_daily DELETE WHERE site_id = '${siteId}'` });
  await clickhouse.command({ query: `ALTER TABLE ${chDb}.rank_observations DELETE WHERE project_id = '${projectId}'` });
  await clickhouse.command({ query: `ALTER TABLE ${chDb}.crawl_page_observations DELETE WHERE site_id = '${siteId}'` });

  const todayStr = new Date().toISOString().slice(0, 10);
  const historicDateStr = new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const nowTimestampStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Feed 1: Content Decay (clicks drop from 50 to 5)
  await clickhouse.insert({
    table: `${chDb}.gsc_page_daily`,
    values: [
      { date: todayStr, site_id: siteId, page: 'https://agency.mavryk.io/blog/seo-tips', clicks: 5, impressions: 100, ctr: 0.05, position: 5.0 },
      { date: historicDateStr, site_id: siteId, page: 'https://agency.mavryk.io/blog/seo-tips', clicks: 50, impressions: 1000, ctr: 0.05, position: 4.5 }
    ],
    format: 'JSONEachRow'
  });

  // Feed 2: CTR Opportunity (high impressions, pos <= 10, ctr < 2%)
  await clickhouse.insert({
    table: `${chDb}.gsc_query_daily`,
    values: [
      { date: todayStr, site_id: siteId, query: 'best enterprise seo agency', clicks: 2, impressions: 2000, ctr: 0.001, position: 2.3 }
    ],
    format: 'JSONEachRow'
  });

  // Feed 3: Striking Distance (avg position between 11 and 20)
  await clickhouse.insert({
    table: `${chDb}.gsc_query_daily`,
    values: [
      { date: todayStr, site_id: siteId, query: 'local seo audit tool', clicks: 0, impressions: 450, ctr: 0.0, position: 14.5 }
    ],
    format: 'JSONEachRow'
  });

  // Feed 4: Keyword Cannibalization (multiple ranking URLs for same keyword)
  await clickhouse.insert({
    table: `${chDb}.rank_observations`,
    values: [
      { timestamp: nowTimestampStr, project_id: projectId, keyword: 'competitor analysis strategy', rank: 4, search_volume: 500, url: 'https://agency.mavryk.io/blog/competitor-analysis-1', competitor_domain: '' },
      { timestamp: nowTimestampStr, project_id: projectId, keyword: 'competitor analysis strategy', rank: 9, search_volume: 500, url: 'https://agency.mavryk.io/blog/competitor-analysis-2', competitor_domain: '' }
    ],
    format: 'JSONEachRow'
  });

  // Feed 5: Orphan Page, Title/Meta, Redirect & Canonical Issues (crawled)
  await clickhouse.insert({
    table: `${chDb}.crawl_page_observations`,
    values: [
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/', status_code: 200, title: 'Mavryk Agency - Best Enterprise SEO Platform', meta_description: 'Mavryk is the leading enterprise agency and SEO platform for content optimization.', load_time_ms: 100, page_size_bytes: 1000, word_count: 50, issues: [], canonical_url: 'https://agency.mavryk.io/' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/orphan-contacts', status_code: 200, title: 'Contacts Us', meta_description: 'Short desc', load_time_ms: 100, page_size_bytes: 1000, word_count: 30, issues: [], canonical_url: 'https://agency.mavryk.io/orphan-contacts' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/about', status_code: 200, title: '', meta_description: 'This is a duplicate description.', load_time_ms: 100, page_size_bytes: 1000, word_count: 30, issues: [], canonical_url: 'https://agency.mavryk.io/about' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/services', status_code: 200, title: 'Services', meta_description: 'This is a duplicate description.', load_time_ms: 100, page_size_bytes: 1000, word_count: 30, issues: [], canonical_url: 'https://agency.mavryk.io/services' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/loop-redirect', status_code: 310, title: '', meta_description: '', load_time_ms: 0, page_size_bytes: 0, word_count: 0, issues: ['redirect_loop'], canonical_url: '' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/chain-redirect', status_code: 301, title: '', meta_description: '', load_time_ms: 0, page_size_bytes: 0, word_count: 0, issues: ['multiple_redirects', 'temporary_redirect'], canonical_url: '' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/temp-redirect', status_code: 302, title: '', meta_description: '', load_time_ms: 0, page_size_bytes: 0, word_count: 0, issues: ['temporary_redirect'], canonical_url: '' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/missing-canonical', status_code: 200, title: 'Missing Canonical Page', meta_description: 'Desc', load_time_ms: 100, page_size_bytes: 1000, word_count: 100, issues: ['missing_canonical'], canonical_url: '' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/mismatch-canonical', status_code: 200, title: 'Mismatch Canonical Page', meta_description: 'Desc', load_time_ms: 100, page_size_bytes: 1000, word_count: 100, issues: ['canonical_domain_mismatch'], canonical_url: 'https://otherdomain.com/mismatch-canonical' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/broken-canonical-source', status_code: 200, title: 'Broken Canonical Source', meta_description: 'Desc', load_time_ms: 100, page_size_bytes: 1000, word_count: 100, issues: [], canonical_url: 'https://agency.mavryk.io/broken-canonical-target' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/broken-canonical-target', status_code: 404, title: 'Broken Canonical Target', meta_description: 'Desc', load_time_ms: 100, page_size_bytes: 1000, word_count: 100, issues: ['error_status_code'], canonical_url: 'https://agency.mavryk.io/broken-canonical-target' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/redirect-canonical-source', status_code: 200, title: 'Redirect Canonical Source', meta_description: 'Desc', load_time_ms: 100, page_size_bytes: 1000, word_count: 100, issues: [], canonical_url: 'https://agency.mavryk.io/redirect-canonical-target' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/redirect-canonical-target', status_code: 301, title: 'Redirect Canonical Target', meta_description: 'Desc', load_time_ms: 100, page_size_bytes: 1000, word_count: 100, issues: ['temporary_redirect'], canonical_url: 'https://agency.mavryk.io/redirect-canonical-target' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/loop-canonical-a', status_code: 200, title: 'Loop Canonical A', meta_description: 'Desc', load_time_ms: 100, page_size_bytes: 1000, word_count: 100, issues: [], canonical_url: 'https://agency.mavryk.io/loop-canonical-b' },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/loop-canonical-b', status_code: 200, title: 'Loop Canonical B', meta_description: 'Desc', load_time_ms: 100, page_size_bytes: 1000, word_count: 100, issues: [], canonical_url: 'https://agency.mavryk.io/loop-canonical-a' }
    ],
    format: 'JSONEachRow'
  });

  console.log('ClickHouse seeding complete.');

  // 4. Trigger DetectorProcessor
  console.log('Instantiating and triggering DetectorProcessor directly...');
  const processor = new DetectorProcessor();
  
  // Clear existing recommendations for project to start fresh
  await db.delete(recommendations).where(eq(recommendations.projectId, projectId));

  // Run the job handler directly (using bypass to test underlying logic)
  const mockJob = {
    id: 'test-detector-job',
    data: { projectId },
    name: 'detector.requested'
  };

  try {
    await processor.handleDetectorJob(mockJob);
    console.log('DetectorProcessor handler completed successfully.');
  } catch (err) {
    console.error('DetectorProcessor handler crashed:', err.message);
    pythonProc.kill();
    process.exit(1);
  }

  // 5. Query Postgres to verify recommendations are populated
  const generatedRecs = await db.select().from(recommendations).where(eq(recommendations.projectId, projectId));
  console.log(`\nGenerated Recommendations Count in Postgres: ${generatedRecs.length}`);
  
  let passed = true;
  if (generatedRecs.length > 0) {
    generatedRecs.forEach((r, idx) => {
      console.log(`Recommendation #${idx + 1}:`);
      console.log(`- Title: "${r.title}"`);
      console.log(`- Priority: ${r.priority}`);
      console.log(`- Impact: ${r.impactScore}, Effort: ${r.effortScore}`);
    });
    
    // Check if we got expected types
    const titles = generatedRecs.map(r => r.title.toLowerCase());
    const hasDecay = titles.some(t => t.includes('decay'));
    const hasCtr = titles.some(t => t.includes('ctr') || t.includes('click-through-rate') || t.includes('optimize ctr'));
    const hasStriking = titles.some(t => t.includes('striking') || t.includes('page 1') || t.includes('page 2'));
    const hasCannibal = titles.some(t => t.includes('cannibal'));
    const hasOrphan = titles.some(t => t.includes('orphan'));
    const hasTitleMeta = titles.some(t => t.includes('title') || t.includes('meta description'));
    const hasRedirect = titles.some(t => t.includes('redirect') || t.includes('chain'));
    const hasCanonical = titles.some(t => t.includes('canonical'));
    const hasIndexability = titles.some(t => t.includes('robots.txt') || t.includes('noindex') || t.includes('unblock') || t.includes('remove noindex'));
    const hasInternalLink = titles.some(t => t.includes('internal link') || t.includes('add internal link'));
    const hasCompetitorGain = titles.some(t => t.includes('competitor') && t.includes('gain') || t.includes('mitigate competitor'));
    const hasLostRanking = titles.some(t => t.includes('recover') || t.includes('ranking drop'));
    const hasWinningPage = titles.some(t => t.includes('winning page') || t.includes('traffic growth'));

    console.log('\n--- Match Checklist ---');
    console.log(`[${hasDecay ? 'x' : ' '}] Content Decay Detected`);
    console.log(`[${hasCtr ? 'x' : ' '}] CTR Opportunity Detected`);
    console.log(`[${hasStriking ? 'x' : ' '}] Striking Distance Detected`);
    console.log(`[${hasCannibal ? 'x' : ' '}] Cannibalization Detected`);
    console.log(`[${hasOrphan ? 'x' : ' '}] Orphan Page Detected`);
    console.log(`[${hasTitleMeta ? 'x' : ' '}] Title/Meta Issue Detected`);
    console.log(`[${hasRedirect ? 'x' : ' '}] Redirect Issue Detected`);
    console.log(`[${hasCanonical ? 'x' : ' '}] Canonical Issue Detected`);
    console.log(`[${hasIndexability ? 'x' : ' '}] Indexability Issue Detected`);
    console.log(`[${hasInternalLink ? 'x' : ' '}] Internal Link Opportunity Detected`);
    console.log(`[${hasCompetitorGain ? 'x' : ' '}] Competitor Gain Detected`);
    console.log(`[${hasLostRanking ? 'x' : ' '}] Lost Ranking Detected`);
    console.log(`[${hasWinningPage ? 'x' : ' '}] Winning Page Detected`);

    if (hasDecay && hasCtr && hasStriking && hasCannibal && hasOrphan && hasTitleMeta && hasRedirect && hasCanonical && hasIndexability && hasInternalLink && hasCompetitorGain && hasLostRanking && hasWinningPage) {
      console.log('\n✅ All 13 SEO error/opportunity categories detected and recommendations created!');
    } else {
      console.error('\n❌ Missing one or more expected recommendation types!');
      passed = false;
    }
  } else {
    console.error('\n❌ No recommendations found in PostgreSQL!');
    passed = false;
  }

  // Terminate FastAPI service
  console.log('Terminating FastAPI AI Service...');
  pythonProc.kill();

  console.log(`\n=== E2E Integration Verification: ${passed ? 'PASSED' : 'FAILED'} ===`);
  process.exit(passed ? 0 : 1);
}

run().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});

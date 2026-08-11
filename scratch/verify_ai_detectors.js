const { db, sites, projects, workspaces, users, recommendations } = require('../packages/db/dist');
const { clickhouse } = require('../packages/clickhouse/dist');
const { eq } = require('drizzle-orm');
const { spawn } = require('child_process');
const axios = require('axios');
const { DetectorProcessor } = require('../services/worker/dist/detector.processor');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('=== Starting E2E Verification for AI Service & SEO Detectors ===');

  // 1. Start Python FastAPI Service in background
  console.log('Starting Python FastAPI AI Service on port 8083...');
  const pythonProc = spawn('python', ['main.py'], {
    cwd: 'services/ai',
    env: { ...process.env, OPENAI_API_KEY: '' } // Force mock fallback for local deterministic test
  });

  pythonProc.stdout.on('data', (data) => console.log(`[FastAPI STDOUT]: ${data.toString().trim()}`));
  pythonProc.stderr.on('data', (data) => console.error(`[FastAPI STDERR]: ${data.toString().trim()}`));

  // Wait 3 seconds for Python to initialize
  await sleep(3000);

  // Check health
  try {
    const health = await axios.get('http://localhost:8083/health');
    console.log('FastAPI Health check status:', health.data);
  } catch (err) {
    console.error('FastAPI Health check failed:', err.message);
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

  // Feed 5: Orphan Page (crawled, but 0 links pointing to it)
  await clickhouse.insert({
    table: `${chDb}.crawl_page_observations`,
    values: [
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/', status_code: 200, title: 'Home', meta_description: 'Home', load_time_ms: 100, page_size_bytes: 1000, word_count: 50, issues: [] },
      { timestamp: nowTimestampStr, site_id: siteId, url: 'https://agency.mavryk.io/orphan-contacts', status_code: 200, title: 'Contacts', meta_description: 'Contacts', load_time_ms: 100, page_size_bytes: 1000, word_count: 30, issues: [] }
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

    console.log('\n--- Match Checklist ---');
    console.log(`[${hasDecay ? 'x' : ' '}] Content Decay Detected`);
    console.log(`[${hasCtr ? 'x' : ' '}] CTR Opportunity Detected`);
    console.log(`[${hasStriking ? 'x' : ' '}] Striking Distance Detected`);
    console.log(`[${hasCannibal ? 'x' : ' '}] Cannibalization Detected`);
    console.log(`[${hasOrphan ? 'x' : ' '}] Orphan Page Detected`);

    if (hasDecay && hasCtr && hasStriking && hasCannibal && hasOrphan) {
      console.log('\n✅ All 5 SEO error/opportunity categories detected and recommendations created!');
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

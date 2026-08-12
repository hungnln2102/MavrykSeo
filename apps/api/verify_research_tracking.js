const { db, workspaces, memberships, users, projects, keywords } = require('@seo/db');
const { clickhouse } = require('@seo/clickhouse');
const { eq, and } = require('drizzle-orm');

const API_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('=== Starting E2E Keyword Research & Rank Tracking Verification ===');

  // 1. Prepare Workspace, Project & Users
  console.log('Seeding database with test workspace and roles...');
  
  const testWorkspaceSlug = 'test-research-workspace-slug';
  let workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, testWorkspaceSlug)
  });

  if (workspace) {
    await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
  }

  // Create Workspace
  const [newWorkspace] = await db.insert(workspaces).values({
    name: 'Test Research Workspace',
    slug: testWorkspaceSlug,
    plan: 'enterprise',
    status: 'active',
  }).returning();
  workspace = newWorkspace;

  // Create Owner User
  const email = 'owner-research@example.com';
  let user = await db.query.users.findFirst({
    where: eq(users.email, email)
  });
  if (!user) {
    const [newUser] = await db.insert(users).values({
      email,
      name: 'Owner Research User',
    }).returning();
    user = newUser;
  }

  // Link user to workspace as owner
  await db.insert(memberships).values({
    userId: user.id,
    workspaceId: workspace.id,
    role: 'owner',
  });

  // Create project
  const [project] = await db.insert(projects).values({
    workspaceId: workspace.id,
    name: 'Test Research Project',
  }).returning();

  console.log('Database seeded successfully.');

  // Login to get token
  console.log('Obtaining authentication token via /auth/login...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!loginRes.ok) {
    throw new Error(`Failed to login: ${loginRes.statusText}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Token successfully obtained.');

  // Helper to make authorized requests
  async function apiRequest(endpoint, method, body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-workspace-id': workspace.id,
    };
    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }
    return fetch(`${API_URL}${endpoint}`, options);
  }

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedCount++;
    }
  }

  // 2. ClickHouse Seeding
  console.log('Seeding ClickHouse with mock rank observations...');
  const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
  const timestampStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Clean old ClickHouse observations for this project
  try {
    await clickhouse.exec({
      query: `ALTER TABLE ${clickhouseDb}.rank_observations DELETE WHERE project_id = '${project.id}'`,
    });
    // Wait a brief moment to let ClickHouse process mutation
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (err) {
    console.warn('Could not clean old ClickHouse rows (might be okay if empty):', err.message);
  }

  const chData = [
    // Keyword: 'seo analyzer'
    { timestamp: timestampStr, project_id: project.id, keyword: 'seo analyzer', rank: 15, search_volume: 1200, url: 'https://agency.mavryk.io/seo-analyzer', competitor_domain: '' },
    { timestamp: timestampStr, project_id: project.id, keyword: 'seo analyzer', rank: 2, search_volume: 1200, url: 'https://competitor1.com/seo-analyzer', competitor_domain: 'competitor1.com' },
    
    // Keyword: 'free rank tracker'
    { timestamp: timestampStr, project_id: project.id, keyword: 'free rank tracker', rank: 2, search_volume: 450, url: 'https://agency.mavryk.io/rank-tracker', competitor_domain: '' },
    { timestamp: timestampStr, project_id: project.id, keyword: 'free rank tracker', rank: 8, search_volume: 450, url: 'https://competitor2.com/rank-tracker', competitor_domain: 'competitor2.com' },

    // Keyword: 'best seo plugin'
    { timestamp: timestampStr, project_id: project.id, keyword: 'best seo plugin', rank: 5, search_volume: 3200, url: 'https://competitor1.com/best-seo-plugin', competitor_domain: 'competitor1.com' },
  ];

  try {
    await clickhouse.insert({
      table: `${clickhouseDb}.rank_observations`,
      values: chData,
      format: 'JSONEachRow',
    });
    console.log('ClickHouse seeding completed.');
  } catch (err) {
    console.error('ClickHouse seeding failed:', err.message);
    throw err;
  }

  // --- Case 1: Add a Tracked Keyword ---
  console.log('\n--- Case 1: Add a Tracked Keyword ---');
  const resAdd = await apiRequest(`/projects/${project.id}/keywords`, 'POST', {
    keyword: 'seo analyzer',
    targetUrl: 'https://agency.mavryk.io/seo-analyzer'
  });
  assert(resAdd.status === 201, `Keyword added successfully (Status: ${resAdd.status})`);
  const addedKeyword = await resAdd.json();
  assert(addedKeyword.keyword === 'seo-analyzer' || addedKeyword.keyword === 'seo analyzer', 'Keyword saved in database matches input');

  // Let's add the other keywords as well
  await apiRequest(`/projects/${project.id}/keywords`, 'POST', { keyword: 'free rank tracker' });
  await apiRequest(`/projects/${project.id}/keywords`, 'POST', { keyword: 'best seo plugin' });

  // --- Case 2: List Tracked Keywords and Merge Rankings ---
  console.log('\n--- Case 2: List Tracked Keywords with Latest Rank ---');
  const resList = await apiRequest(`/projects/${project.id}/keywords`, 'GET');
  assert(resList.status === 200, `List tracked keywords returns 200 (Status: ${resList.status})`);
  const list = await resList.json();
  assert(list.length >= 3, `Returned at least 3 keywords (Got: ${list.length})`);
  
  const seoAnalyzerItem = list.find(k => k.keyword === 'seo analyzer');
  assert(seoAnalyzerItem !== undefined, 'Found "seo analyzer" in list');
  if (seoAnalyzerItem) {
    assert(seoAnalyzerItem.latestRank === 15, `Rank merged correctly from ClickHouse (Expected: 15, Got: ${seoAnalyzerItem.latestRank})`);
  }

  // --- Case 3: Ad-hoc Keyword Research ---
  console.log('\n--- Case 3: Ad-hoc Keyword Research (Search Volume, CPC & Intent) ---');
  const resResearch = await apiRequest(`/projects/${project.id}/keywords/research`, 'POST', {
    keyword: 'best rank tracker tool'
  });
  assert(resResearch.status === 201 || resResearch.status === 200, `Ad-hoc research returns success (Status: ${resResearch.status})`);
  const researchData = await resResearch.json();
  assert(researchData.keyword === 'best rank tracker tool', 'Research result matches requested keyword');
  assert(typeof researchData.searchVolume === 'number' && researchData.searchVolume > 0, `Search volume populated (Got: ${researchData.searchVolume})`);
  assert(typeof researchData.cpc === 'number' && researchData.cpc > 0, `CPC populated (Got: ${researchData.cpc})`);
  assert(researchData.intent === 'commercial', `Intent classified correctly using ruleset (Expected: commercial, Got: ${researchData.intent})`);
  assert(researchData.results.length > 0, `SERP results list returned (Count: ${researchData.results.length})`);

  // --- Case 4: Keyword Clustering ---
  console.log('\n--- Case 4: Keyword Clustering (SERP Similarity) ---');
  const resCluster = await apiRequest(`/projects/${project.id}/keywords/cluster`, 'POST', {
    keywords: [
      'seo tool pro',
      'seo tools pro',
      'best free seo tool',
      'iphone 15 review'
    ]
  });
  assert(resCluster.status === 201 || resCluster.status === 200, `Keyword clustering returns success (Status: ${resCluster.status})`);
  const clusters = await resCluster.json();
  assert(clusters.length > 0, `Returned grouped clusters (Got: ${clusters.length})`);
  
  // Since Go collector generates SERP results with standard mock domains (including agency.mavryk.io),
  // seo tool pro, seo tools pro, and best free seo tool will share many URLs in their mock SERPs,
  // whereas 'iphone 15 review' will have different domains or won't overlap as much.
  // Therefore, the first three should cluster together, while the fourth is separate.
  const largeCluster = clusters.find(c => c.keywords.includes('seo tool pro') && c.keywords.includes('seo tools pro'));
  assert(largeCluster !== undefined, 'Similar SEO keywords grouped into the same cluster');
  if (largeCluster) {
    console.log(`[INFO] Grouped cluster name: "${largeCluster.cluster_name}", intent: "${largeCluster.intent}", keywords: [${largeCluster.keywords.join(', ')}]`);
  }

  // --- Case 5: Competitor Gap Analysis ---
  console.log('\n--- Case 5: Competitor Gap Analysis ---');
  const resGap = await apiRequest(`/projects/${project.id}/competitors/gap`, 'GET');
  assert(resGap.status === 200, `Competitor gap analysis returns 200 (Status: ${resGap.status})`);
  const gaps = await resGap.json();
  
  // We expect 'seo analyzer' to be a gap (competitor ranks 2, we rank 15)
  // We expect 'best seo plugin' to be a gap (competitor ranks 5, we don't rank)
  // We expect 'free rank tracker' to NOT be a gap (competitor ranks 8, we rank 2)
  const hasAnalyzerGap = gaps.some(g => g.keyword === 'seo analyzer' && g.competitorDomain === 'competitor1.com' && g.competitorRank === 2 && g.ownRank === 15);
  const hasPluginGap = gaps.some(g => g.keyword === 'best seo plugin' && g.competitorDomain === 'competitor1.com' && g.competitorRank === 5 && g.ownRank === null);
  const hasTrackerGap = gaps.some(g => g.keyword === 'free rank tracker');

  assert(hasAnalyzerGap, 'Identified gap: "seo analyzer" (competitor #2, own #15)');
  assert(hasPluginGap, 'Identified gap: "best seo plugin" (competitor #5, own null)');
  assert(!hasTrackerGap, 'Correctly filtered out "free rank tracker" since we rank top 10 (#2)');

  // --- Case 6: Competitor Rankings Log ---
  console.log('\n--- Case 6: Competitor Rankings Daily History ---');
  const resHistory = await apiRequest(`/projects/${project.id}/competitors/rankings`, 'GET');
  assert(resHistory.status === 200, `Competitor rankings history returns 200 (Status: ${resHistory.status})`);
  const history = await resHistory.json();
  assert(history.length > 0, `Returned ranking history rows (Got: ${history.length})`);
  const ownRanking = history.find(h => h.domain === 'own' && h.keyword === 'free rank tracker');
  assert(ownRanking !== undefined, 'Found own ranking history row');
  if (ownRanking) {
    assert(ownRanking.rank === 2, `Own ranking matches ClickHouse data (Expected: 2, Got: ${ownRanking.rank})`);
  }

  // --- Case 7: Delete Tracked Keyword ---
  console.log('\n--- Case 7: Delete Tracked Keyword ---');
  const resDelete = await apiRequest(`/projects/${project.id}/keywords/${addedKeyword.id}`, 'DELETE');
  assert(resDelete.status === 200, `Keyword deleted successfully (Status: ${resDelete.status})`);
  const deletedResult = await resDelete.json();
  assert(deletedResult.success === true, 'Delete endpoint returns success: true');

  // Verify deletion from db
  const checkDeleted = await db.query.keywords.findFirst({
    where: eq(keywords.id, addedKeyword.id)
  });
  assert(checkDeleted === undefined, 'Keyword no longer exists in PostgreSQL database');

  // Clean ClickHouse rows
  try {
    await clickhouse.exec({
      query: `ALTER TABLE ${clickhouseDb}.rank_observations DELETE WHERE project_id = '${project.id}'`,
    });
  } catch (e) {}

  // Cleanup PG Workspace
  await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
  console.log('\nWorkspace and database records cleaned up.');

  console.log('\n=== E2E Research & Tracking Verification Completed ===');
  console.log(`Total tests passed: ${passedCount}`);
  console.log(`Total tests failed: ${failedCount}`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch(err => {
  console.error('Verification run failed with error:', err);
  process.exit(1);
});

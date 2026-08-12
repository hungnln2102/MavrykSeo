const { db, workspaces, memberships, users, projects, topics, contentPlans, briefs } = require('@seo/db');
const { eq, and } = require('drizzle-orm');

const API_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('=== Starting E2E Content Marketing (Phase 4) Verification ===');

  // 1. Prepare Workspace, Project & Users
  console.log('Seeding database with test workspace and roles...');
  
  const testWorkspaceSlug = 'test-content-workspace-slug';
  let workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, testWorkspaceSlug)
  });

  if (workspace) {
    // Delete existing to clean slate
    await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
  }

  // Create Workspace
  const [newWorkspace] = await db.insert(workspaces).values({
    name: 'Test Content Workspace',
    slug: testWorkspaceSlug,
    plan: 'enterprise',
    status: 'active',
  }).returning();
  workspace = newWorkspace;

  // Create Owner User
  const email = 'owner-content@example.com';
  let user = await db.query.users.findFirst({
    where: eq(users.email, email)
  });
  if (!user) {
    const [newUser] = await db.insert(users).values({
      email,
      name: 'Owner Content User',
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
    name: 'Test Content Project',
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
    } else if (method === 'POST' || method === 'PATCH') {
      options.body = '{}';
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

  // --- Case 1: Create Topic Authority Map ---
  console.log('\n--- Case 1: Topic Authority Map ---');
  
  // Create Parent Topic
  const resParentTopic = await apiRequest(`/projects/${project.id}/topics`, 'POST', {
    name: 'SEO Tools',
    keywords: ['seo tools', 'best free seo tools']
  });
  assert(resParentTopic.status === 201, `Parent topic created (Status: ${resParentTopic.status})`);
  const parentTopic = await resParentTopic.status === 201 ? await resParentTopic.json() : null;
  assert(parentTopic && parentTopic.name === 'SEO Tools', 'Parent topic name matches input');

  // Create Child Topic
  let childTopic = null;
  if (parentTopic) {
    const resChildTopic = await apiRequest(`/projects/${project.id}/topics`, 'POST', {
      name: 'Keyword Research Tools',
      parentId: parentTopic.id,
      keywords: ['keyword tools', 'keyword planner']
    });
    assert(resChildTopic.status === 201, `Child topic created referencing parent (Status: ${resChildTopic.status})`);
    childTopic = await resChildTopic.status === 201 ? await resChildTopic.json() : null;
    assert(childTopic && childTopic.parentId === parentTopic.id, 'Child topic correctly references parent ID');
  }

  // Get Topic Map Hierarchy
  const resTopics = await apiRequest(`/projects/${project.id}/topics`, 'GET');
  assert(resTopics.status === 200, `Fetch topic map returns 200 (Status: ${resTopics.status})`);
  const topicsList = await resTopics.json();
  assert(topicsList.length >= 2, `Topic map has at least 2 entities (Got: ${topicsList.length})`);
  
  // --- Case 2: Create & List Content Plans ---
  console.log('\n--- Case 2: Content Planning & Calendar ---');
  
  const resCreatePlan = await apiRequest(`/projects/${project.id}/content-plans`, 'POST', {
    title: 'Top 10 Best Free Keyword Research Tools in 2026',
    primaryKeyword: 'keyword research tools',
    secondaryKeywords: ['free keyword tools', 'seo search', 'keyword planning'],
    topicId: childTopic ? childTopic.id : undefined,
    status: 'planned',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  });
  assert(resCreatePlan.status === 201, `Content plan created successfully (Status: ${resCreatePlan.status})`);
  const contentPlan = await resCreatePlan.status === 201 ? await resCreatePlan.json() : null;
  assert(contentPlan && contentPlan.primaryKeyword === 'keyword research tools', 'Content plan primary keyword saved successfully');

  // List Content Plans
  const resPlansList = await apiRequest(`/projects/${project.id}/content-plans`, 'GET');
  assert(resPlansList.status === 200, `Fetch content plans list returns 200 (Status: ${resPlansList.status})`);
  const plansList = await resPlansList.json();
  assert(plansList.some(p => p.id === contentPlan.id), 'Created content plan exists in the list');

  // --- Case 3: AI Brief Generation ---
  console.log('\n--- Case 3: AI Content Brief Generation ---');
  
  if (contentPlan) {
    const resBriefGen = await apiRequest(`/projects/${project.id}/content-plans/${contentPlan.id}/brief`, 'POST');
    assert(resBriefGen.status === 201, `AI Brief generation API triggered successfully (Status: ${resBriefGen.status})`);
    const brief = await resBriefGen.status === 201 ? await resBriefGen.json() : null;
    assert(brief && brief.contentPlanId === contentPlan.id, 'Generated brief links correctly to the content plan');
    assert(brief && brief.outline && brief.outline.length > 0, `Brief outline structured successfully (Headings count: ${brief?.outline?.length})`);
    assert(brief && typeof brief.targetWordCount === 'number' && brief.targetWordCount > 0, `Brief specifies a valid word count target: ${brief?.targetWordCount}`);

    // Fetch Brief
    const resGetBrief = await apiRequest(`/projects/${project.id}/content-plans/${contentPlan.id}/brief`, 'GET');
    assert(resGetBrief.status === 200, `Retrieve generated brief returns 200 (Status: ${resGetBrief.status})`);
    const retrievedBrief = await resGetBrief.json();
    assert(retrievedBrief.id === brief.id, 'Retrieved brief matches generated brief');
  }

  // --- Case 4: Real-time Content Optimization & Draft Syncing ---
  console.log('\n--- Case 4: Real-time Content Optimization & Draft Syncing ---');
  
  if (contentPlan) {
    // 4.1 Check initial optimization with empty content
    const resOptimizeEmpty = await apiRequest(`/projects/${project.id}/content-plans/${contentPlan.id}/optimize`, 'POST', {
      bodyText: ''
    });
    assert(resOptimizeEmpty.status === 201, `Real-time optimize endpoint returns 201 (Status: ${resOptimizeEmpty.status})`);
    const emptyResult = await resOptimizeEmpty.json();
    assert(emptyResult.score === 0, `SEO Score is 0 for empty draft (Got: ${emptyResult.score})`);
    assert(emptyResult.suggestions.includes('Start writing content to receive real-time SEO feedback.'), 'Correct warning returned for empty text');

    // 4.2 Write a partially optimized article draft
    // The brief contains headings like: "Complete Guide to Keyword Research Tools", "Introduction to Keyword Research Tools", "Conclusion"
    const articleDraft = `
# Complete Guide to Keyword Research Tools

Introduction to keyword research tools: Finding the right terms is essential for modern search marketing. When you do keyword research tools research, you uncover what users are typing.

## Why Keyword Research Tools is Essential for Success

Using free keyword tools and keyword planning inside your workflow helps you rank.

## Conclusion
This concludes our guide.
`;

    const resOptimize = await apiRequest(`/projects/${project.id}/content-plans/${contentPlan.id}/optimize`, 'POST', {
      bodyText: articleDraft
    });
    assert(resOptimize.status === 201, `Draft optimization returns 201 (Status: ${resOptimize.status})`);
    const optResult = await resOptimize.json();
    assert(optResult.word_count > 0, `Word count calculated correctly (Count: ${optResult.word_count})`);
    assert(optResult.primary_keyword_density > 0, `Primary keyword density calculated (Density: ${optResult.primary_keyword_density}%)`);
    assert(optResult.score >= 25, `SEO Score is calculated and reasonable (Score: ${optResult.score})`);
    
    // Check if body was synced in content plan
    const resCheckSync = await apiRequest(`/projects/${project.id}/content-plans`, 'GET');
    const updatedPlans = await resCheckSync.json();
    const updatedPlan = updatedPlans.find(p => p.id === contentPlan.id);
    assert(updatedPlan && updatedPlan.body === articleDraft, 'Editor body was successfully saved/synced to database');
  }

  // Cleaning up test workspace
  console.log('\nCleaning up test workspace...');
  await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
  console.log('Cleanup completed.');

  console.log('\n=== E2E Content Marketing Verification Summary ===');
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error('Some E2E verification cases failed!');
    process.exit(1);
  } else {
    console.log('All E2E content marketing verification test cases passed successfully!');
    process.exit(0);
  }
}

runVerification().catch(err => {
  console.error('Verification crashed with error:', err);
  process.exit(1);
});

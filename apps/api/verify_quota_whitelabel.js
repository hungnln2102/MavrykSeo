const { db, workspaces, memberships, users, projects, sites, reports } = require('@seo/db');
const { eq } = require('drizzle-orm');

const API_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('=== Starting E2E Quota, Suspension & White-Label Verification ===');

  // 1. Prepare Workspace, Project & Users
  console.log('Seeding database with test workspace and roles...');
  
  const testWorkspaceSlug = 'test-quota-workspace-slug';
  let workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, testWorkspaceSlug)
  });

  if (workspace) {
    await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
  }

  // Create Workspace
  const [newWorkspace] = await db.insert(workspaces).values({
    name: 'Test Quota Workspace',
    slug: testWorkspaceSlug,
    plan: 'free',
    status: 'active',
  }).returning();
  workspace = newWorkspace;

  // Create Owner User
  const email = 'owner-quota@example.com';
  let user = await db.query.users.findFirst({
    where: eq(users.email, email)
  });
  if (!user) {
    const [newUser] = await db.insert(users).values({
      email,
      name: 'Owner Quota User',
    }).returning();
    user = newUser;
  }

  // Link user to workspace as owner
  await db.insert(memberships).values({
    userId: user.id,
    workspaceId: workspace.id,
    role: 'owner',
  });

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

  // Case 1: Tenant Suspension
  console.log('\n--- Case 1: Tenant Suspension ---');
  
  // Set to suspended
  const resSuspend = await apiRequest(`/workspaces/${workspace.id}/status`, 'PATCH', { status: 'suspended' });
  assert(resSuspend.status === 200, `Admin can suspend workspace (Status: ${resSuspend.status})`);

  // Attempt request when suspended -> expect 403 Forbidden
  const resSuspendedReq = await apiRequest('/projects', 'GET');
  assert(resSuspendedReq.status === 403, `Suspended workspace request is blocked with 403 Forbidden (Status: ${resSuspendedReq.status})`);
  const errorMsg = await resSuspendedReq.json();
  assert(errorMsg.message === 'Workspace is suspended. Please contact support.', `Forbidden error message is correct: "${errorMsg.message}"`);

  // Set back to active
  const resActive = await apiRequest(`/workspaces/${workspace.id}/status`, 'PATCH', { status: 'active' });
  assert(resActive.status === 200, `Admin can unsuspend workspace (Status: ${resActive.status})`);

  // Request should now pass
  const resActiveReq = await apiRequest('/projects', 'GET');
  assert(resActiveReq.status === 200, `Active workspace request is allowed (Status: ${resActiveReq.status})`);


  // Case 2: Resource Quota Limits (Projects & Sites)
  console.log('\n--- Case 2: Resource Quota Limits (Projects & Sites) ---');
  
  // Set plan to Free
  await apiRequest(`/workspaces/${workspace.id}/plan`, 'PATCH', { plan: 'free' });

  // Free plan project quota check (max 1)
  const resProj1 = await apiRequest('/projects', 'POST', { name: 'Free Project 1' });
  assert(resProj1.status === 201, `Free Plan: Creating project 1 is ALLOWED (Status: ${resProj1.status})`);
  const proj1 = await resProj1.json();

  const resProj2 = await apiRequest('/projects', 'POST', { name: 'Free Project 2' });
  assert(resProj2.status === 400, `Free Plan: Creating project 2 is BLOCKED with 400 Bad Request (Status: ${resProj2.status})`);

  // Free plan site quota check (max 1)
  const resSite1 = await apiRequest('/sites', 'POST', { projectId: proj1.id, domain: 'site1.com' });
  assert(resSite1.status === 201, `Free Plan: Creating site 1 is ALLOWED (Status: ${resSite1.status})`);

  const resSite2 = await apiRequest('/sites', 'POST', { projectId: proj1.id, domain: 'site2.com' });
  assert(resSite2.status === 400, `Free Plan: Creating site 2 is BLOCKED with 400 Bad Request (Status: ${resSite2.status})`);

  // Upgrade workspace to Pro
  const resUpgradePro = await apiRequest(`/workspaces/${workspace.id}/plan`, 'PATCH', { plan: 'pro' });
  assert(resUpgradePro.status === 200, `Upgraded workspace to Pro (Status: ${resUpgradePro.status})`);

  // Pro plan project quota check (max 5)
  const proProjects = [];
  for (let i = 2; i <= 5; i++) {
    const res = await apiRequest('/projects', 'POST', { name: `Pro Project ${i}` });
    assert(res.status === 201, `Pro Plan: Creating project ${i} is ALLOWED (Status: ${res.status})`);
    if (res.status === 201) {
      proProjects.push(await res.json());
    }
  }

  // Attempting 6th project -> expect 400
  const resProj6 = await apiRequest('/projects', 'POST', { name: 'Pro Project 6' });
  assert(resProj6.status === 400, `Pro Plan: Creating project 6 is BLOCKED with 400 Bad Request (Status: ${resProj6.status})`);


  // Case 3: Rate Limiting
  console.log('\n--- Case 3: Workspace Rate Limiting ---');
  
  // Set plan to Free (limit 60/min)
  await apiRequest(`/workspaces/${workspace.id}/plan`, 'PATCH', { plan: 'free' });

  console.log('Sending requests in a loop to trigger rate limiter...');
  let hitRateLimit = false;
  
  // We make 65 rapid requests to trigger 429
  for (let k = 0; k < 65; k++) {
    const res = await apiRequest('/projects', 'GET');
    if (res.status === 429) {
      hitRateLimit = true;
      const rateLimitMsg = await res.json();
      assert(true, `Successfully hit Rate Limiter: ${rateLimitMsg.message}`);
      break;
    }
  }
  
  assert(hitRateLimit, 'Rate limiting (429 Too Many Requests) was triggered successfully.');


  // Case 4: White-Label Config & Reports
  console.log('\n--- Case 4: White-Label Config & Reports ---');
  
  // Upgrade to enterprise first to clear/bypass rate limit
  await apiRequest(`/workspaces/${workspace.id}/plan`, 'PATCH', { plan: 'enterprise' });

  // Update White-Label Colors & Logo
  const brandingLogo = 'https://agency.com/logo.png';
  const brandingColors = { primary: '#990000', secondary: '#111111' };

  const resBranding = await apiRequest('/workspaces/active/white-label', 'PATCH', {
    logo: brandingLogo,
    colors: brandingColors,
  });
  assert(resBranding.status === 200, `Owner updated white-label preferences (Status: ${resBranding.status})`);
  const brandingData = await resBranding.json();
  assert(brandingData.whiteLabelLogo === brandingLogo, 'Branding logo saved correctly');
  assert(brandingData.whiteLabelColors.primary === brandingColors.primary, 'Branding primary color saved correctly');

  // Fetch White-Label Branding
  const resGetBranding = await apiRequest('/workspaces/active/white-label', 'GET');
  assert(resGetBranding.status === 200, `Fetched branding preferences (Status: ${resGetBranding.status})`);
  const getBrandingData = await resGetBranding.json();
  assert(getBrandingData.whiteLabelLogo === brandingLogo, 'Fetched logo matches config');

  // Create White-label Report
  const resCreateReport = await apiRequest(`/projects/${proj1.id}/reports`, 'POST', {
    title: 'Monthly Organic Visibility Report',
    type: 'seo',
  });
  assert(resCreateReport.status === 201, `Created report successfully (Status: ${resCreateReport.status})`);
  const reportData = await resCreateReport.json();
  
  // Assert the report's metadata has the branding embedded
  assert(reportData.metadata.branding.logo === brandingLogo, 'Report metadata has the white-label logo URL embedded');
  assert(reportData.metadata.branding.colors.primary === brandingColors.primary, 'Report metadata has the white-label primary color embedded');
  assert(reportData.metadata.renderedHtml.includes(brandingColors.primary), 'Report rendered HTML includes custom branding primary color styling');

  // Fetch Reports
  const resListReports = await apiRequest(`/projects/${proj1.id}/reports`, 'GET');
  assert(resListReports.status === 200, `Fetched reports list successfully (Status: ${resListReports.status})`);
  const reportsList = await resListReports.json();
  assert(reportsList.length > 0, 'Report list is not empty');

  // Cleanup test workspace
  console.log('\nCleaning up E2E Quota/White-Label test workspace...');
  await db.delete(workspaces).where(eq(workspaces.slug, testWorkspaceSlug));
  console.log('Cleanup complete.');

  console.log(`\n=== Verification Complete: ${passedCount} PASSED, ${failedCount} FAILED ===`);
  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch(err => {
  console.error('Fatal error during E2E Quota/White-Label verification:', err);
  process.exit(1);
});

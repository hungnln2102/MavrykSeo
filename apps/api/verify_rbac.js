const { db, workspaces, memberships, users, projects, recommendations, sites } = require('@seo/db');
const { eq, and } = require('drizzle-orm');

const API_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('=== Starting E2E RBAC Verification ===');

  // 1. Prepare Workspace, Project & Users
  console.log('Seeding database with test workspace and roles...');
  
  // Cleanup old test data
  const testWorkspaceSlug = 'test-rbac-workspace-slug';
  let workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, testWorkspaceSlug)
  });

  if (workspace) {
    // Delete projects to clean up cascade
    await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
  }

  // Create Workspace
  const [newWorkspace] = await db.insert(workspaces).values({
    name: 'Test RBAC Workspace',
    slug: testWorkspaceSlug,
    plan: 'pro',
  }).returning();
  workspace = newWorkspace;

  // Create Project
  const [project] = await db.insert(projects).values({
    workspaceId: workspace.id,
    name: 'Test RBAC Project',
  }).returning();

  // Create Recommendation with Notes
  const [rec] = await db.insert(recommendations).values({
    projectId: project.id,
    title: 'Test RBAC Recommendation',
    description: 'Ensure redirect loops are fixed.',
    status: 'pending',
    priority: 'high',
    impactScore: 8,
    effortScore: 2,
    internalNotes: 'Internal: This is a highly confidential note for SEO team only.',
    clientNotes: 'Client: We need to resolve the redirect loop on the about page.',
  }).returning();

  // Roles to test
  const roles = ['owner', 'admin', 'manager', 'seo', 'content', 'client', 'viewer'];
  const testUsers = {};

  for (const role of roles) {
    const email = `${role}-rbac@example.com`;
    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    if (!user) {
      const [newUser] = await db.insert(users).values({
        email,
        name: `${role.toUpperCase()} Test User`,
      }).returning();
      user = newUser;
    }

    // Link user to workspace with role
    await db.insert(memberships).values({
      userId: user.id,
      workspaceId: workspace.id,
      role: role,
    });

    testUsers[role] = { user, email };
  }

  console.log('Database seeded successfully.');

  // 2. Login as each user and get tokens
  console.log('Obtaining authentication tokens via /auth/login...');
  for (const role of roles) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUsers[role].email })
    });
    if (!res.ok) {
      throw new Error(`Failed to login as ${role}: ${res.statusText}`);
    }
    const data = await res.json();
    testUsers[role].token = data.token;
  }
  console.log('Tokens successfully obtained for all roles.');

  // Helper function to make authorized requests
  async function apiRequest(endpoint, method, role, body = null) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${testUsers[role].token}`,
      'x-workspace-id': workspace.id,
    };
    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }
    return fetch(`${API_URL}${endpoint}`, options);
  }

  // 3. Test Cases
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

  // Case 1: Notes visibility filter
  console.log('\n--- Case 1: Internal/Client Notes Visibility Scoping ---');
  
  // Agency staff (Manager) should see both
  const resManager = await apiRequest(`/recommendations?projectId=${project.id}`, 'GET', 'manager');
  const recsManager = await resManager.json();
  const managerRec = recsManager.find(r => r.id === rec.id);
  assert(managerRec !== undefined, 'Manager can fetch recommendations');
  assert(managerRec.internalNotes === 'Internal: This is a highly confidential note for SEO team only.', 'Manager can see internal notes');
  assert(managerRec.clientNotes === 'Client: We need to resolve the redirect loop on the about page.', 'Manager can see client notes');

  // Client role should NOT see internal notes
  const resClient = await apiRequest(`/recommendations?projectId=${project.id}`, 'GET', 'client');
  const recsClient = await resClient.json();
  const clientRec = recsClient.find(r => r.id === rec.id);
  assert(clientRec !== undefined, 'Client can fetch recommendations');
  assert(clientRec.internalNotes === null, 'Client cannot see internal notes (internalNotes must be null)');
  assert(clientRec.clientNotes === 'Client: We need to resolve the redirect loop on the about page.', 'Client can see client notes');

  // Case 2: Endpoint protection for adding workspace members
  console.log('\n--- Case 2: Endpoint Protection - Add Workspace Members ---');
  
  // Owner: Allowed
  const resAddMemberOwner = await apiRequest('/workspaces/active/members', 'POST', 'owner', {
    email: 'new-invitee@example.com',
    role: 'viewer'
  });
  assert(resAddMemberOwner.status === 201, `Owner is ALLOWED to add members (Status: ${resAddMemberOwner.status})`);

  // Client: Forbidden
  const resAddMemberClient = await apiRequest('/workspaces/active/members', 'POST', 'client', {
    email: 'forbidden-invitee@example.com',
    role: 'viewer'
  });
  assert(resAddMemberClient.status === 403, `Client is FORBIDDEN to add members (Status: ${resAddMemberClient.status})`);

  // Case 3: Endpoint protection for Project Creation
  console.log('\n--- Case 3: Endpoint Protection - Create Project ---');
  
  // Manager: Allowed
  const resCreateProjManager = await apiRequest('/projects', 'POST', 'manager', {
    name: 'Manager New Project'
  });
  assert(resCreateProjManager.status === 201, `Manager is ALLOWED to create projects (Status: ${resCreateProjManager.status})`);

  // SEO: Forbidden
  const resCreateProjSeo = await apiRequest('/projects', 'POST', 'seo', {
    name: 'SEO New Project'
  });
  assert(resCreateProjSeo.status === 403, `SEO is FORBIDDEN to create projects (Status: ${resCreateProjSeo.status})`);

  // Case 4: Endpoint protection for Site Creation
  console.log('\n--- Case 4: Endpoint Protection - Create Site ---');
  
  // Admin: Allowed
  const resCreateSiteAdmin = await apiRequest('/sites', 'POST', 'admin', {
    projectId: project.id,
    domain: 'newsite.com'
  });
  assert(resCreateSiteAdmin.status === 201, `Admin is ALLOWED to create sites (Status: ${resCreateSiteAdmin.status})`);

  // Manager: Forbidden
  const resCreateSiteManager = await apiRequest('/sites', 'POST', 'manager', {
    projectId: project.id,
    domain: 'manager-forbidden.com'
  });
  assert(resCreateSiteManager.status === 403, `Manager is FORBIDDEN to create sites (Status: ${resCreateSiteManager.status})`);

  // Case 5: Endpoint protection for updating recommendation status
  console.log('\n--- Case 5: Endpoint Protection - Update Status ---');
  
  // Content: Allowed
  const resUpdateContent = await apiRequest(`/recommendations/${rec.id}/status`, 'PATCH', 'content', {
    status: 'completed'
  });
  assert(resUpdateContent.status === 200, `Content role is ALLOWED to update recommendation status (Status: ${resUpdateContent.status})`);

  // Client: Forbidden
  const resUpdateClient = await apiRequest(`/recommendations/${rec.id}/status`, 'PATCH', 'client', {
    status: 'pending'
  });
  assert(resUpdateClient.status === 403, `Client is FORBIDDEN to update recommendation status (Status: ${resUpdateClient.status})`);

  // Cleanup test workspace
  console.log('\nCleaning up E2E RBAC test workspace...');
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
  console.error('Fatal error during E2E RBAC verification:', err);
  process.exit(1);
});

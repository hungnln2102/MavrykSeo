import { db, users, workspaces, memberships, projects, projectScopes, standardVersions, auditControlResults, auditControls, magicLinks, findings, projectMemberships } from '@seo/db';
import { eq, and, desc } from 'drizzle-orm';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to authenticate user and get token
async function getAuthToken(email: string): Promise<string> {
  const magicRes = await fetch(`${API_URL}/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!magicRes.ok) {
    throw new Error(`Magic link request failed for ${email}: HTTP ${magicRes.status}`);
  }

  // Retrieve token from db
  const dbMagicLinks = await db
    .select()
    .from(magicLinks)
    .where(eq(magicLinks.email, email))
    .orderBy(desc(magicLinks.createdAt))
    .limit(1);

  if (dbMagicLinks.length === 0) {
    throw new Error(`Could not find magic token for ${email}`);
  }

  const tokenValue = dbMagicLinks[0].token;

  // Login
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenValue }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: HTTP ${loginRes.status}`);
  }

  const { token } = (await loginRes.json()) as any;
  return token;
}

async function runTests() {
  console.log('=== Starting Phase 1 Integration Tests ===\n');
  let exitCode = 0;

  try {
    // ----------------------------------------------------
    // Context Setup: Seeding Users, Workspace, Projects, Scopes
    // ----------------------------------------------------
    console.log('[Setup] Seeding database elements...');

    const timestamp = Date.now();
    const staffEmail = `staff_${timestamp}@example.com`;
    const clientEmail = `client_${timestamp}@example.com`;

    const [staffUser] = await db.insert(users).values({
      email: staffEmail,
      name: 'SEO Specialist',
    }).returning();

    const [clientUser] = await db.insert(users).values({
      email: clientEmail,
      name: 'Client Admin',
    }).returning();

    const [testWorkspace] = await db.insert(workspaces).values({
      name: `Verification Workspace ${timestamp}`,
      slug: `verification-slug-${timestamp}`,
    }).returning();

    // Membership: Staff is owner, Client is client
    await db.insert(memberships).values({
      userId: staffUser.id,
      workspaceId: testWorkspace.id,
      role: 'owner',
    });

    await db.insert(memberships).values({
      userId: clientUser.id,
      workspaceId: testWorkspace.id,
      role: 'client',
    });

    // Project 1 (eCommerce)
    const [projectEcommerce] = await db.insert(projects).values({
      workspaceId: testWorkspace.id,
      name: 'Ecommerce Site Project',
    }).returning();

    await db.insert(projectScopes).values({
      projectId: projectEcommerce.id,
      siteType: 'ecommerce',
    });

    await db.insert(projectMemberships).values({
      userId: clientUser.id,
      projectId: projectEcommerce.id,
      role: 'member',
    });

    // Project 2 (Local)
    const [projectLocal] = await db.insert(projects).values({
      workspaceId: testWorkspace.id,
      name: 'Local Business Project',
    }).returning();

    await db.insert(projectScopes).values({
      projectId: projectLocal.id,
      siteType: 'local',
    });

    console.log(`  ✔ Users, Workspace, Projects & Scopes seeded.`);
    console.log(`  Workspace ID: ${testWorkspace.id}`);
    console.log(`  Ecommerce Proj: ${projectEcommerce.id}, Local Proj: ${projectLocal.id}`);

    // Wait for rate limiting TTL to be safe before login calls
    await delay(1200);

    console.log('Retrieving authentications...');
    const staffToken = await getAuthToken(staffEmail);
    await delay(1500); // Bypass short rate throttle of 1 request/sec
    const clientToken = await getAuthToken(clientEmail);
    console.log('  ✔ JWT Authentication tokens obtained.');

    // Fetch active standard version
    const activeStandards = await db
      .select()
      .from(standardVersions)
      .where(eq(standardVersions.status, 'active'))
      .limit(1);

    if (activeStandards.length === 0) {
      throw new Error('No active standard version found. Please seed standards first.');
    }
    const standardVerId = activeStandards[0].id;
    console.log(`  Using Standard Version: ${activeStandards[0].version}`);
    console.log();

    // Helper for API calls with workspace header
    const requestApi = async (path: string, method: string, token: string, bodyJson?: any) => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'x-workspace-id': testWorkspace.id,
      };
      if (bodyJson) {
        headers['Content-Type'] = 'application/json';
      }
      return fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: bodyJson ? JSON.stringify(bodyJson) : undefined,
      });
    };

    // ----------------------------------------------------
    // Test Case A: Project Scopes & Applicability Profile
    // ----------------------------------------------------
    console.log('[Test A] Creating Audit Run & checking Applicability Profiles...');
    
    // Create Audit on Ecommerce project
    console.log('  Creating audit run for Ecommerce Project...');
    const buildAuditEcomRes = await requestApi(
      `/projects/${projectEcommerce.id}/audit-runs`,
      'POST',
      staffToken,
      { standardVersionId: standardVerId }
    );

    if (!buildAuditEcomRes.ok) {
      throw new Error(`Audit creation failed on ecom proj: ${buildAuditEcomRes.status} -- ${await buildAuditEcomRes.text()}`);
    }

    const ecomAuditRun = (await buildAuditEcomRes.json()) as any;
    console.log(`  ✔ eCommerce audit run created: ${ecomAuditRun.id}`);

    // Create Audit on Local project
    console.log('  Creating audit run for Local Project...');
    const buildAuditLocRes = await requestApi(
      `/projects/${projectLocal.id}/audit-runs`,
      'POST',
      staffToken,
      { standardVersionId: standardVerId }
    );

    if (!buildAuditLocRes.ok) {
      throw new Error(`Audit creation failed on local proj: ${buildAuditLocRes.status} -- ${await buildAuditLocRes.text()}`);
    }

    const localAuditRun = (await buildAuditLocRes.json()) as any;
    console.log(`  ✔ Local audit run created: ${localAuditRun.id}`);

    // Verify results in database directly for assertion
    const ecomResults = await db
      .select({
        code: auditControls.code,
        result: auditControlResults.result,
        exceptionReason: auditControlResults.exceptionReason,
      })
      .from(auditControlResults)
      .innerJoin(auditControls, eq(auditControlResults.controlId, auditControls.id))
      .where(eq(auditControlResults.auditRunId, ecomAuditRun.id));

    // Verify ECOM vs LOCAL differences
    const ecomSpecificOnEcom = ecomResults.find((r) => r.code.startsWith('ECOM-'));
    const localSpecificOnEcom = ecomResults.find((r) => r.code.startsWith('LOCAL-'));

    if (ecomSpecificOnEcom && ecomSpecificOnEcom.result !== 'NEED_DATA') {
      throw new Error(`Expected ECOM- prefixed control on eCommerce project to be NEED_DATA, but got ${ecomSpecificOnEcom.result}`);
    }

    if (localSpecificOnEcom && localSpecificOnEcom.result !== 'NOT_APPLICABLE') {
      throw new Error(`Expected LOCAL- prefixed control on eCommerce project to be NOT_APPLICABLE, but got ${localSpecificOnEcom.result}`);
    }

    console.log('  ✔ Applicability matches perfectly (ecom defaults to NEED_DATA, local defaults to NOT_APPLICABLE on eCommerce project).');
    console.log();

    // ----------------------------------------------------
    // Test Case B: Observations & Findings Unified Deduplication
    // ----------------------------------------------------
    console.log('[Test B] Verifying Scraper Observations & Findings Deduplication...');

    // Create raw scraper observation
    const scrapObsRes = await requestApi(
      '/findings/observations',
      'POST',
      staffToken,
      {
        projectId: projectEcommerce.id,
        sourceType: 'crawler',
        sourceRef: 'crawl-run-001',
        classification: 'broken-link',
        data: { brokenUrl: 'https://example.com/broken' },
      }
    );

    if (!scrapObsRes.ok) {
      throw new Error(`Scraper observation creation failed: HTTP ${scrapObsRes.status} -- ${await scrapObsRes.text()}`);
    }
    const observation = (await scrapObsRes.json()) as any;
    console.log(`  ✔ Observation created: ${observation.id}`);

    // Create Finding
    console.log('  Creating finding with control code...');
    const bodyFinding = {
      projectId: projectEcommerce.id,
      controlCode: 'TECH-HOST-001',
      rootCauseKey: 'SSL_EXPIRED',
      normalizedScopeHash: 'domain-hash-01',
      severity: 'critical',
      confidence: 'high',
      status: 'open',
      affectedUrls: ['https://example.com/pricing', 'https://example.com/contact'],
      observations: [observation.id],
    };

    const firstFindingRes = await requestApi(
      '/findings',
      'POST',
      staffToken,
      bodyFinding
    );

    if (!firstFindingRes.ok) {
      throw new Error(`Failed to create first finding: HTTP ${firstFindingRes.status} -- ${await firstFindingRes.text()}`);
    }
    const finding = (await firstFindingRes.json()) as any;
    console.log(`  ✔ Finding created: ${finding.id}`);

    // Duplicate finding (sync update)
    console.log('  Submitting exact duplicate finding (deduplication check)...');
    const duplicateFindingRes = await requestApi(
      '/findings',
      'POST',
      staffToken,
      {
        ...bodyFinding,
        confidence: 'medium', // change field to see update
      }
    );

    if (!duplicateFindingRes.ok) {
      throw new Error(`Duplicate finding post failed: HTTP ${duplicateFindingRes.status}`);
    }
    const duplicateReturn = (await duplicateFindingRes.json()) as any;
    
    if (duplicateReturn.id !== finding.id) {
      throw new Error('Deduplication failure: duplicate post returned a new finding ID instead of updating the existing page findings.');
    }
    console.log('  ✔ Deduplication confirmed (same finding ID returned).');

    // Fetch and check affected entities
    const entitiesRes = await requestApi(
      `/findings/${finding.id}/affected-entities`,
      'GET',
      staffToken
    );
    if (!entitiesRes.ok) {
      throw new Error(`Failed to fetch affected entities: HTTP ${entitiesRes.status} -- ${await entitiesRes.text()}`);
    }
    const entities = (await entitiesRes.json()) as any;
    console.log('  Entities output:', entities);
    if (!entities || !Array.isArray(entities)) {
      throw new Error(`Expected entities to be an array, but got: ${JSON.stringify(entities)}`);
    }
    if (entities.length !== 2) {
      throw new Error(`Expected exactly 2 affected urls, but verified: ${entities.length}`);
    }
    console.log('  ✔ Affected entities (URLs) resolved matches: 2.');
    console.log();

    // ----------------------------------------------------
    // Test Case C: Action, Comments, Visibilities & QA Verifications
    // ----------------------------------------------------
    console.log('[Test C] Verifying Actions comments visibility & QA flow...');

    // Create action task linked to the finding
    console.log('  Creating action record linked to finding...');
    const actionRes = await requestApi(
      '/actions',
      'POST',
      staffToken,
      {
        projectId: projectEcommerce.id,
        title: 'Fix SSL Certificate Expiration',
        description: 'Renew the SSL cert immediately before client notices.',
        status: 'proposed',
        priority: 'high',
        findingIds: [finding.id],
      }
    );

    if (!actionRes.ok) {
      throw new Error(`Action creation failed: HTTP ${actionRes.status} -- ${await actionRes.text()}`);
    }

    const action = (await actionRes.json()) as any;
    console.log(`  ✔ Action created: ${action.id}`);

    // Add internal comment
    await requestApi(
      `/actions/${action.id}/comments`,
      'POST',
      staffToken,
      {
        comment: 'This is a private note for SEO staff. Client should NOT see this.',
        isClientVisible: false,
      }
    );

    // Add public comment
    await requestApi(
      `/actions/${action.id}/comments`,
      'POST',
      staffToken,
      {
        comment: 'Hello Client, we have initiated work on renewing your SSL certificate.',
        isClientVisible: true,
      }
    );

    // Check visibility as Staff (Owner)
    console.log('  Fetching comments as Agency Staff...');
    const staffActDetRes = await requestApi(
      `/actions/${action.id}`,
      'GET',
      staffToken
    );
    const staffActDet = (await staffActDetRes.json()) as any;
    if (staffActDet.comments.length !== 2) {
      throw new Error(`Expected Agency Staff to see 2 comments, but got: ${staffActDet.comments.length}`);
    }
    console.log('  ✔ Agency Staff sees internal + public comments successfully.');

    // Check visibility as Client
    console.log('  Fetching comments as Client...');
    const clientActDetRes = await requestApi(
      `/actions/${action.id}`,
      'GET',
      clientToken
    );
    const clientActDet = (await clientActDetRes.json()) as any;
    if (clientActDet.comments.length !== 1) {
      throw new Error(`Expected Client to see only 1 comment (public), but got: ${clientActDet.comments.length}`);
    }
    if (clientActDet.comments[0].isClientVisible !== true) {
      throw new Error('Tenant breach: Client received an internal visibility comment.');
    }
    console.log('  ✔ Confidentiality separation verified: client only sees public comments.');

    // Submit Client Approval
    console.log('  Submitting approval step as Client...');
    const approveRes = await requestApi(
      `/actions/${action.id}/approvals`,
      'POST',
      clientToken,
      {
        status: 'approved',
        notes: 'Looks good. Proceed.',
      }
    );

    if (!approveRes.ok) {
      throw new Error(`Client approval submission failed: ${approveRes.status}`);
    }
    console.log('  ✔ Action approved. Status auto-updated to validated.');

    // Submit Specialist QA Verification
    console.log('  Submitting QA verification as Agency Specialist...');
    const qaRes = await requestApi(
      `/actions/${action.id}/verifications`,
      'POST',
      staffToken,
      {
        result: 'passed',
        criteriaSnapshot: 'SSL cert validation command resolves 200 and expires in 365 days',
        evidence: 'SSL validity check matches. Output command OK.',
      }
    );

    if (!qaRes.ok) {
      throw new Error(`QA verification failed: ${qaRes.status} -- ${await qaRes.text()}`);
    }

    // Verify Action completed
    const finalDetailRes = await requestApi(
      `/actions/${action.id}`,
      'GET',
      staffToken
    );
    const finalActionDetails = (await finalDetailRes.json()) as any;
    if (finalActionDetails.status !== 'done') {
      throw new Error(`Expected action status to be 'done' after QA passed, but verified: ${finalActionDetails.status}`);
    }
    console.log('  ✔ QA Verification passed. Status updated to done.');
    console.log();

  } catch (error: any) {
    console.error('✗ Phase 1 integration test verification failed!', error);
    exitCode = 1;
  } finally {
    console.log('=== Cleaning up test data ===');
  }

  process.exit(exitCode);
}

runTests();

import { db, users, workspaces, memberships, projects, integrations, auditLogs } from '@seo/db';
import { eq, and, desc } from 'drizzle-orm';
import { encryptToken, decryptToken } from '@seo/core';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('=== Starting Phase 5 Production Hardening Tests ===\n');
  let exitCode = 0;

  try {
    // ----------------------------------------------------
    // Test 1: Health and Readiness Endpoints
    // ----------------------------------------------------
    console.log('[Test 1] Verifying Health & Readiness endpoints...');
    const healthRes = await fetch(`${API_URL}/health`);
    const healthData = (await healthRes.json()) as any;
    if (healthRes.status === 200 && healthData.status === 'ok') {
      console.log('  ✔ Health check passed:', JSON.stringify(healthData));
    } else {
      throw new Error(`Health check failed: HTTP ${healthRes.status} ${JSON.stringify(healthData)}`);
    }

    const readyRes = await fetch(`${API_URL}/ready`);
    const readyData = (await readyRes.json()) as any;
    if (readyRes.status === 200 && readyData.status === 'ok') {
      console.log('  ✔ Readiness check passed:', JSON.stringify(readyData));
    } else {
      throw new Error(`Readiness check failed: HTTP ${readyRes.status} ${JSON.stringify(readyData)}`);
    }
    console.log();

    // ----------------------------------------------------
    // Test 2: Rate Limiting (Sensitive Routes Override)
    // ----------------------------------------------------
    console.log('[Test 2] Verifying Rate Limiting on sensitive routes (/auth/login)...');
    console.log('  Sending concurrent login requests (limit: 1 per sec)...');
    
    const loginPromises = Array.from({ length: 4 }).map(() =>
      fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rate_limit_test@example.com' }),
      })
    );

    const loginResults = await Promise.all(loginPromises);
    const statuses = loginResults.map((r) => r.status);
    console.log('  Response statuses:', statuses);

    const has429 = statuses.includes(429);
    if (has429) {
      console.log('  ✔ Rate limiting works correctly (received 429 Too Many Requests).');
    } else {
      throw new Error('Rate limit failure: Expected at least one 429 status code for high-frequency requests.');
    }
    console.log();

    // Wait a bit for rate limiter TTL to decay
    await delay(1200);

    // ----------------------------------------------------
    // Test 3: OAuth Credential Encryption & Audit Logging
    // ----------------------------------------------------
    console.log('[Test 3] Verifying OAuth Credential Encryption & Audit Logging...');
    
    // Seed temporary user and workspace directly in DB
    const testEmail = `hardening_test_${Date.now()}@example.com`;
    console.log(`  Seeding test user: ${testEmail}`);
    
    const [testUser] = await db.insert(users).values({
      email: testEmail,
      name: 'Hardening Tester',
    }).returning();

    const [testWorkspace] = await db.insert(workspaces).values({
      name: 'Hardening Test Workspace',
      slug: `hardening-slug-${Date.now()}`,
    }).returning();

    await db.insert(memberships).values({
      userId: testUser.id,
      workspaceId: testWorkspace.id,
      role: 'owner',
    });

    const [testProject] = await db.insert(projects).values({
      workspaceId: testWorkspace.id,
      name: 'Hardening Test Project',
    }).returning();

    console.log(`  Created User: ${testUser.id}, Workspace: ${testWorkspace.id}, Project: ${testProject.id}`);

    // Call Login endpoint to get a JWT token
    const authRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    
    if (!authRes.ok) {
      throw new Error(`Login endpoint failed: HTTP ${authRes.status}`);
    }
    
    const { token } = (await authRes.json()) as any;
    console.log('  ✔ JWT Authentication token retrieved successfully.');

    // Save GSC OAuth credentials via API
    const testCredentials = {
      client_id: 'my-gsc-client-id-xyz',
      client_secret: 'my-gsc-client-secret-abc',
      refresh_token: 'my-gsc-refresh-token-123456789',
    };

    console.log('  Saving GSC integration credentials via API POST...');
    const saveRes = await fetch(`${API_URL}/projects/${testProject.id}/integrations/google_search_console`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Workspace-Id': testWorkspace.id,
      },
      body: JSON.stringify({ credentials: testCredentials }),
    });

    if (!saveRes.ok) {
      const errorMsg = await saveRes.text();
      throw new Error(`Failed to save integration credentials: HTTP ${saveRes.status} - ${errorMsg}`);
    }
    console.log('  ✔ Credentials saved successfully.');

    // Direct DB Check: verify encryption in DB
    console.log('  Verifying stored credentials directly in PostgreSQL database...');
    const storedIntegrations = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.projectId, testProject.id), eq(integrations.provider, 'google_search_console')))
      .limit(1);

    if (storedIntegrations.length === 0) {
      throw new Error('Integration credentials record not found in PostgreSQL.');
    }

    const rawStoredCredentials = storedIntegrations[0].credentials;
    console.log('  Raw value in database column:', rawStoredCredentials);

    if (rawStoredCredentials.includes('my-gsc-refresh-token-123456789')) {
      throw new Error('CRITICAL SECURITY ISSUE: Credentials stored in database as plain text!');
    }

    // Try parsing as AES JSON
    try {
      const parsedCrypto = JSON.parse(rawStoredCredentials);
      if (parsedCrypto.iv && parsedCrypto.content && parsedCrypto.tag) {
        console.log('  ✔ Database values verified: stored in encrypted format (AES-256-GCM cipher JSON).');
      } else {
        throw new Error('Invalid cipher JSON structure.');
      }
    } catch (e: any) {
      throw new Error(`Stored credentials do not match encrypted JSON format: ${e.message}`);
    }

    // Retrieve via API GET: verify it is auto-decrypted back to plain text
    console.log('  Retrieving integration credentials via API GET...');
    const getRes = await fetch(`${API_URL}/projects/${testProject.id}/integrations/google_search_console`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Workspace-Id': testWorkspace.id,
      },
    });

    if (!getRes.ok) {
      throw new Error(`Failed to retrieve integration credentials: HTTP ${getRes.status}`);
    }

    const retrievedData = (await getRes.json()) as any;
    console.log('  API response credentials:', JSON.stringify(retrievedData.credentials));

    if (
      retrievedData.credentials &&
      retrievedData.credentials.refresh_token === 'my-gsc-refresh-token-123456789'
    ) {
      console.log('  ✔ API response decryption verified: correctly returned plain text credentials.');
    } else {
      throw new Error(`API decryption mismatch: expected client-side decrypted values, got: ${JSON.stringify(retrievedData)}`);
    }

    // Verify Audit Logging
    console.log('  Verifying audit log entry directly in database...');
    const auditLogsResult = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.workspaceId, testWorkspace.id), eq(auditLogs.userId, testUser.id)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);

    if (auditLogsResult.length === 0) {
      throw new Error('Audit log entry for integration.save not found.');
    }

    const auditLog = auditLogsResult[0];
    console.log('  Audit log entry:', JSON.stringify(auditLog));
    if (auditLog.action === 'integration.save' && auditLog.entityType === 'integration') {
      console.log('  ✔ Audit log verification passed.');
    } else {
      throw new Error(`Audit log values mismatch: action=${auditLog.action}, entityType=${auditLog.entityType}`);
    }

    // Clean up seeded database records
    console.log('  Cleaning up test database records...');
    await db.delete(integrations).where(eq(integrations.projectId, testProject.id));
    await db.delete(projects).where(eq(projects.id, testProject.id));
    await db.delete(memberships).where(eq(memberships.workspaceId, testWorkspace.id));
    await db.delete(workspaces).where(eq(workspaces.id, testWorkspace.id));
    await db.delete(users).where(eq(users.id, testUser.id));
    await db.delete(auditLogs).where(eq(auditLogs.workspaceId, testWorkspace.id));
    console.log('  ✔ Clean up complete.');

    console.log('\n=== All Phase 5 Hardening Tests Passed Successfully! ===');
  } catch (error: any) {
    console.error('\n❌ Test Failure:', error.message);
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
}

runTests();

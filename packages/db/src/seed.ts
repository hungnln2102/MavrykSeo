import { eq } from 'drizzle-orm';
import { client, db, memberships, projects, sites, users, workspaces } from './index.js';

const confirmation = process.env.DEMO_SEED_CONFIRMATION;

if (process.env.NODE_ENV === 'production') {
  throw new Error('Demo seed is disabled when NODE_ENV=production.');
}

if (confirmation !== 'seed-demo') {
  throw new Error('Set DEMO_SEED_CONFIRMATION=seed-demo before running the demo seed.');
}

const demo = {
  userId: '00000000-0000-4000-8000-000000000001',
  workspaceId: '00000000-0000-4000-8000-000000000002',
  projectId: '00000000-0000-4000-8000-000000000003',
  siteId: '00000000-0000-4000-8000-000000000004',
  email: 'demo.owner@example.test',
  workspaceSlug: 'demo-agency',
  siteDomain: 'demo.example.test',
};

async function seedDemoWorkspace(): Promise<void> {
  await db
    .insert(users)
    .values({ id: demo.userId, email: demo.email, name: 'Demo Owner' })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: 'Demo Owner', updatedAt: new Date() },
    });

  await db
    .insert(workspaces)
    .values({
      id: demo.workspaceId,
      name: 'Demo Agency Workspace',
      slug: demo.workspaceSlug,
      plan: 'free',
      status: 'active',
    })
    .onConflictDoUpdate({
      target: workspaces.slug,
      set: { name: 'Demo Agency Workspace', plan: 'free', status: 'active', updatedAt: new Date() },
    });

  await db
    .insert(memberships)
    .values({ userId: demo.userId, workspaceId: demo.workspaceId, role: 'owner' })
    .onConflictDoUpdate({
      target: [memberships.userId, memberships.workspaceId],
      set: { role: 'owner', updatedAt: new Date() },
    });

  const existingProject = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, demo.projectId))
    .limit(1);

  if (existingProject.length === 0) {
    await db.insert(projects).values({
      id: demo.projectId,
      workspaceId: demo.workspaceId,
      name: 'Demo SEO Project',
    });
  } else if (existingProject[0].workspaceId !== demo.workspaceId) {
    throw new Error('Demo project ID belongs to a different workspace. Refusing to seed across tenants.');
  }

  await db
    .insert(sites)
    .values({ id: demo.siteId, projectId: demo.projectId, domain: demo.siteDomain })
    .onConflictDoUpdate({
      target: [sites.projectId, sites.domain],
      set: { updatedAt: new Date() },
    });

  console.log(JSON.stringify({
    workspaceId: demo.workspaceId,
    projectId: demo.projectId,
    siteId: demo.siteId,
    email: demo.email,
  }));
}

seedDemoWorkspace()
  .catch((error: unknown) => {
    console.error('Failed to seed demo workspace:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { db } from '@seo/db';
import { TenantGuard } from './tenant.guard';

jest.mock('@seo/db', () => ({
  db: { select: jest.fn() },
  memberships: { userId: 'memberships.userId', workspaceId: 'memberships.workspaceId' },
  workspaces: { id: 'workspaces.id' },
  supportSessions: { userId: 'supportSessions.userId', workspaceId: 'supportSessions.workspaceId', expiresAt: 'supportSessions.expiresAt' },
}));

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions: unknown[]) => conditions),
  eq: jest.fn((column: unknown, value: unknown) => ({ column, value })),
  gt: jest.fn((column: unknown, value: unknown) => ({ op: 'gt', column, value })),
}));

const mockSelect = db.select as jest.Mock;

function createContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as never;
}

function mockSelectResults(...results: unknown[][]) {
  mockSelect.mockReset();

  for (const result of results) {
    mockSelect.mockReturnValueOnce({
      from: () => ({
        where: () => ({
          limit: jest.fn().mockResolvedValue(result),
        }),
      }),
    });
  }
}

describe('TenantGuard', () => {
  const guard = new TenantGuard();

  beforeEach(() => {
    mockSelect.mockReset();
  });

  it('rejects an unauthenticated request before querying the database', async () => {
    await expect(guard.canActivate(createContext({ headers: {} }))).rejects.toThrow(
      new ForbiddenException('User is not authenticated'),
    );
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('rejects a request without an explicit workspace header', async () => {
    await expect(guard.canActivate(createContext({ user: { id: 'user-1' }, headers: {} }))).rejects.toThrow(
      new BadRequestException('Missing x-workspace-id header'),
    );
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('rejects a forged workspace that has no membership for the authenticated user', async () => {
    mockSelectResults([], []);

    await expect(
      guard.canActivate(createContext({
        user: { id: 'user-1' },
        headers: { 'x-workspace-id': 'forged-workspace' },
        url: '/projects',
      })),
    ).rejects.toThrow(new ForbiddenException('User does not belong to this workspace'));
  });

  it('allows access via an active support session even if user is not a workspace member', async () => {
    mockSelectResults(
      [], // No normal membership
      [{ id: 'session-123', reason: 'debugging workspace' }], // Active support session
      [{ id: 'workspace-1', plan: 'pro', status: 'active' }], // Workspace checks pass
    );

    const request = {
      user: { id: 'user-1' },
      headers: { 'x-workspace-id': 'workspace-1' },
      url: '/projects',
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request).toMatchObject({
      workspaceId: 'workspace-1',
      userRole: 'admin',
      isSupportSession: true,
      supportSessionId: 'session-123',
      supportReason: 'debugging workspace',
    });
  });

  it('rejects a workspace ID that has no workspace record', async () => {
    mockSelectResults([{ role: 'admin' }], []);

    await expect(
      guard.canActivate(createContext({
        user: { id: 'user-1' },
        headers: { 'x-workspace-id': 'missing-workspace' },
        url: '/projects',
      })),
    ).rejects.toThrow(new BadRequestException('Workspace not found'));
  });

  it('rejects normal access to a suspended workspace', async () => {
    mockSelectResults([{ role: 'viewer' }], [{ id: 'workspace-1', plan: 'free', status: 'suspended' }]);

    await expect(
      guard.canActivate(createContext({
        user: { id: 'user-1' },
        headers: { 'x-workspace-id': 'workspace-1' },
        url: '/projects',
      })),
    ).rejects.toThrow(new ForbiddenException('Workspace is suspended. Please contact support.'));
  });

  it('injects the verified tenant context only after membership and workspace checks pass', async () => {
    mockSelectResults([{ role: 'admin' }], [{ id: 'workspace-1', plan: 'pro', status: 'active' }]);
    const request = {
      user: { id: 'user-1' },
      headers: { 'x-workspace-id': 'workspace-1' },
      url: '/projects',
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request).toMatchObject({
      workspaceId: 'workspace-1',
      userRole: 'admin',
      workspacePlan: 'pro',
      workspace: { id: 'workspace-1', status: 'active' },
    });
  });

  it('allows the explicit status route for a suspended workspace', async () => {
    mockSelectResults([{ role: 'owner' }], [{ id: 'workspace-1', plan: 'free', status: 'suspended' }]);

    await expect(
      guard.canActivate(createContext({
        user: { id: 'user-1' },
        headers: { 'x-workspace-id': 'workspace-1' },
        url: '/workspaces/status',
      })),
    ).resolves.toBe(true);
  });
});
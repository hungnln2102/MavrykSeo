import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectGuard } from './project.guard';
import { ScopingHelper } from './scoping.helper';
import { db } from '@seo/db';
import { UserRole } from '@seo/core';

// Mock DB
jest.mock('@seo/db', () => ({
  db: {
    select: jest.fn(),
  },
  projects: { id: 'projects.id', workspaceId: 'projects.workspaceId' },
  projectMemberships: { id: 'pm.id', projectId: 'pm.projectId', userId: 'pm.userId' },
  sites: { id: 'site.id', projectId: 'site.projectId' },
  recommendations: { id: 'rec.id', projectId: 'rec.projectId' },
  reports: { id: 'rep.id', projectId: 'rep.projectId' },
  keywords: { id: 'kw.id', projectId: 'kw.projectId' },
  auditRuns: { id: 'ar.id', projectId: 'ar.projectId' },
  topics: { id: 'topic.id', projectId: 'topic.projectId' },
  contentPlans: { id: 'cp.id', projectId: 'cp.projectId' },
  briefs: { id: 'brief.id', projectId: 'brief.projectId' },
  auditControlResults: { id: 'acr.id', auditRunId: 'acr.auditRunId' },
}));

function mockDbQuery(rows: any[]) {
  (db.select as jest.Mock).mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(rows),
      }),
      innerJoin: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(rows),
        }),
      }),
    }),
  });
}

function createExecutionContext(requestOverrides: Record<string, any>) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'user-123' },
        workspaceId: 'workspace-456',
        userRole: 'seo' as UserRole,
        params: {},
        body: {},
        query: {},
        headers: {},
        url: '',
        ...requestOverrides,
      }),
    }),
  } as any;
}

describe('ProjectGuard & ScopingHelper', () => {
  let scopingHelper: ScopingHelper;
  let guard: ProjectGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    scopingHelper = new ScopingHelper();
    guard = new ProjectGuard(scopingHelper);
  });

  describe('ScopingHelper.scopeProjectQuery', () => {
    it('returns project if it belongs to workspace', async () => {
      const mockProject = { id: 'proj-1', workspaceId: 'workspace-456', name: 'Mavryk Project' };
      mockDbQuery([mockProject]);

      const result = await scopingHelper.scopeProjectQuery('workspace-456', 'proj-1');
      expect(result).toEqual(mockProject);
    });

    it('throws NotFoundException if project is missing or owned by another tenant', async () => {
      mockDbQuery([]);

      await expect(
        scopingHelper.scopeProjectQuery('workspace-456', 'proj-other')
      ).rejects.toThrow(new NotFoundException('Project not found in this workspace.'));
    });
  });

  describe('ScopingHelper.assertProjectMember', () => {
    it('returns true automatically for owner role', async () => {
      const result = await scopingHelper.assertProjectMember('user-123', 'proj-1', 'owner');
      expect(result).toBe(true);
    });

    it('returns true automatically for admin role', async () => {
      const result = await scopingHelper.assertProjectMember('user-123', 'proj-1', 'admin');
      expect(result).toBe(true);
    });

    it('returns true automatically for manager role', async () => {
      const result = await scopingHelper.assertProjectMember('user-123', 'proj-1', 'manager');
      expect(result).toBe(true);
    });

    it('verifies list of projectMemberships if role is non-admin (e.g. seo)', async () => {
      mockDbQuery([{ id: 'pm-1' }]);

      const result = await scopingHelper.assertProjectMember('user-123', 'proj-1', 'seo');
      expect(result).toBe(true);
    });

    it('throws ForbiddenException if non-admin is not part of the project memberships', async () => {
      mockDbQuery([]);

      await expect(
        scopingHelper.assertProjectMember('user-123', 'proj-1', 'client')
      ).rejects.toThrow(new ForbiddenException('Access denied. You do not have project-level membership for this project.'));
    });
  });

  describe('ScopingHelper.redactInternalNotes', () => {
    it('does not redact internal notes for agency staff', () => {
      const rec = { id: 'rec-1', internalNotes: 'Only staff can see this', clientNotes: 'For clients' };
      
      const res = scopingHelper.redactInternalNotes(rec, 'seo');
      expect(res).toEqual(rec);
    });

    it('redacts internal notes for client and external viewer roles', () => {
      const rec = { id: 'rec-1', internalNotes: 'Only staff can see this', clientNotes: 'For clients' };
      
      const res = scopingHelper.redactInternalNotes(rec, 'client') as any;
      expect(res.internalNotes).toBeNull();
      expect(res.clientNotes).toBe('For clients');
    });
  });

  describe('ProjectGuard.canActivate', () => {
    it('throws ForbiddenException if no project context (projectId or sub-resource ID) is found', async () => {
      const context = createExecutionContext({ params: {}, body: {} });
      await expect(guard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('Project context could not be resolved.')
      );
    });

    it('validates project-membership if projectId is specified directly in route params', async () => {
      const context = createExecutionContext({
        params: { projectId: 'proj-1' },
      });

      // 1. scopeProjectQuery returns project
      mockDbQuery([{ id: 'proj-1', workspaceId: 'workspace-456' }]);
      // 2. assertProjectMember verifies membership (mocking database query)
      (db.select as jest.Mock).mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: jest.fn().mockResolvedValue([{ id: 'proj-1' }]),
          }),
        }),
      }).mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: jest.fn().mockResolvedValue([{ id: 'pm-1' }]),
          }),
        }),
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});

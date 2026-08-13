import { NotFoundException } from '@nestjs/common';
import { db, projects, recommendations } from '@seo/db';
import { and, eq } from 'drizzle-orm';
import { RecommendationsService } from './recommendations.service';

jest.mock('@seo/db', () => ({
  db: { select: jest.fn(), update: jest.fn() },
  projects: { id: 'projects.id', workspaceId: 'projects.workspaceId' },
  recommendations: {
    id: 'recommendations.id',
    projectId: 'recommendations.projectId',
    title: 'recommendations.title',
    description: 'recommendations.description',
    status: 'recommendations.status',
    priority: 'recommendations.priority',
    impactScore: 'recommendations.impactScore',
    effortScore: 'recommendations.effortScore',
    internalNotes: 'recommendations.internalNotes',
    clientNotes: 'recommendations.clientNotes',
    createdAt: 'recommendations.createdAt',
    updatedAt: 'recommendations.updatedAt',
  },
}));

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions: unknown[]) => ({ type: 'and', conditions })),
  eq: jest.fn((column: unknown, value: unknown) => ({ type: 'eq', column, value })),
}));

const mockSelect = db.select as jest.Mock;
const mockUpdate = db.update as jest.Mock;
const mockAnd = and as jest.Mock;
const mockEq = eq as jest.Mock;

function mockRecommendationList(result: unknown[]) {
  mockSelect.mockReturnValue({
    from: () => ({
      innerJoin: () => ({ where: jest.fn().mockResolvedValue(result) }),
    }),
  });
}

function mockScopedRecommendation(result: unknown[]) {
  mockSelect.mockReturnValue({
    from: () => ({
      innerJoin: () => ({
        where: () => ({ limit: jest.fn().mockResolvedValue(result) }),
      }),
    }),
  });
}

describe('RecommendationsService tenant scoping and client visibility', () => {
  const service = new RecommendationsService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not return recommendations from another workspace', async () => {
    mockRecommendationList([]);

    await expect(service.getRecommendations('workspace-2', 'project-1', 'client')).resolves.toEqual([]);

    expect(mockEq).toHaveBeenCalledWith(projects.workspaceId, 'workspace-2');
    expect(mockEq).toHaveBeenCalledWith(recommendations.projectId, 'project-1');
  });

  it('hides internal notes from a Client while retaining client-visible notes', async () => {
    mockRecommendationList([{
      id: 'recommendation-1',
      projectId: 'project-1',
      internalNotes: 'Agency-only implementation detail',
      clientNotes: 'Client-safe next step',
    }]);

    await expect(service.getRecommendations('workspace-1', 'project-1', 'client')).resolves.toEqual([{
      id: 'recommendation-1',
      projectId: 'project-1',
      internalNotes: null,
      clientNotes: 'Client-safe next step',
    }]);
  });

  it('returns internal notes to an authorized agency role', async () => {
    mockRecommendationList([{
      id: 'recommendation-1',
      projectId: 'project-1',
      internalNotes: 'Agency-only implementation detail',
      clientNotes: 'Client-safe next step',
    }]);

    await expect(service.getRecommendations('workspace-1', 'project-1', 'seo')).resolves.toEqual([{
      id: 'recommendation-1',
      projectId: 'project-1',
      internalNotes: 'Agency-only implementation detail',
      clientNotes: 'Client-safe next step',
    }]);
  });

  it.each([
    ['status', (instance: RecommendationsService) => instance.updateRecommendationStatus('workspace-2', 'recommendation-1', 'accepted')],
    ['assignee', (instance: RecommendationsService) => instance.updateRecommendationAssignee('workspace-2', 'recommendation-1', 'user-1')],
    ['notes', (instance: RecommendationsService) => instance.updateRecommendationNotes('workspace-2', 'recommendation-1', 'private', 'public')],
  ])('rejects cross-workspace %s updates before mutating a recommendation', async (_operation, execute) => {
    mockScopedRecommendation([]);

    await expect(execute(service)).rejects.toThrow(
      new NotFoundException('Recommendation not found in this workspace'),
    );

    expect(mockEq).toHaveBeenCalledWith(recommendations.id, 'recommendation-1');
    expect(mockEq).toHaveBeenCalledWith(projects.workspaceId, 'workspace-2');
    expect(mockAnd).toHaveBeenCalledWith(
      { type: 'eq', column: recommendations.id, value: 'recommendation-1' },
      { type: 'eq', column: projects.workspaceId, value: 'workspace-2' },
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
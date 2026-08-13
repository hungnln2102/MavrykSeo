import { NotFoundException } from '@nestjs/common';
import { db, projects } from '@seo/db';
import { and, eq } from 'drizzle-orm';
import { ProjectsService } from './projects.service';

jest.mock('@seo/db', () => ({
  db: { select: jest.fn() },
  projects: { id: 'projects.id', workspaceId: 'projects.workspaceId' },
  workspaces: { id: 'workspaces.id' },
}));

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions: unknown[]) => ({ type: 'and', conditions })),
  count: jest.fn(),
  eq: jest.fn((column: unknown, value: unknown) => ({ type: 'eq', column, value })),
}));

const mockSelect = db.select as jest.Mock;
const mockAnd = and as jest.Mock;
const mockEq = eq as jest.Mock;

function mockProjectQuery(result: unknown[]) {
  mockSelect.mockReturnValue({
    from: () => ({
      where: () => ({
        limit: jest.fn().mockResolvedValue(result),
      }),
    }),
  });
}

describe('ProjectsService tenant scoping', () => {
  const service = new ProjectsService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries a project using both its object ID and the active workspace ID', async () => {
    const project = { id: 'project-1', workspaceId: 'workspace-1', name: 'Owned project' };
    mockProjectQuery([project]);

    await expect(service.getProjectById('workspace-1', 'project-1')).resolves.toEqual(project);

    expect(mockEq).toHaveBeenCalledWith(projects.id, 'project-1');
    expect(mockEq).toHaveBeenCalledWith(projects.workspaceId, 'workspace-1');
    expect(mockAnd).toHaveBeenCalledWith(
      { type: 'eq', column: projects.id, value: 'project-1' },
      { type: 'eq', column: projects.workspaceId, value: 'workspace-1' },
    );
  });

  it('does not reveal a project when its object ID is requested from another workspace', async () => {
    mockProjectQuery([]);

    await expect(service.getProjectById('workspace-2', 'project-1')).rejects.toThrow(
      new NotFoundException('Project not found in the active workspace'),
    );
    expect(mockEq).toHaveBeenCalledWith(projects.workspaceId, 'workspace-2');
  });
});
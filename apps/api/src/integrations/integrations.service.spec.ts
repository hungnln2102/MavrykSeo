import { NotFoundException } from '@nestjs/common';
import { db, projects } from '@seo/db';
import { and, eq } from 'drizzle-orm';
import { IntegrationsService } from './integrations.service';

jest.mock('@seo/db', () => ({
  db: { select: jest.fn() },
  projects: { id: 'projects.id', workspaceId: 'projects.workspaceId' },
  integrations: { id: 'integrations.id', projectId: 'integrations.projectId', provider: 'integrations.provider' },
}));

jest.mock('@seo/core', () => ({
  encryptToken: jest.fn(),
  decryptToken: jest.fn(),
}));

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions: unknown[]) => ({ type: 'and', conditions })),
  eq: jest.fn((column: unknown, value: unknown) => ({ type: 'eq', column, value })),
}));

const mockSelect = db.select as jest.Mock;
const mockAnd = and as jest.Mock;
const mockEq = eq as jest.Mock;

function mockProjectLookup(result: unknown[]) {
  mockSelect.mockReturnValue({
    from: () => ({
      where: () => ({ limit: jest.fn().mockResolvedValue(result) }),
    }),
  });
}

describe('IntegrationsService tenant scoping', () => {
  const service = new IntegrationsService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['save credentials', (instance: IntegrationsService) => instance.saveIntegration('workspace-2', 'project-1', 'gsc', { refreshToken: 'secret' })],
    ['read credentials', (instance: IntegrationsService) => instance.getIntegration('workspace-2', 'project-1', 'gsc')],
  ])('rejects cross-workspace project access before attempting to %s', async (_operation, execute) => {
    mockProjectLookup([]);

    await expect(execute(service)).rejects.toThrow(
      new NotFoundException('Project not found in this workspace'),
    );

    expect(mockEq).toHaveBeenCalledWith(projects.id, 'project-1');
    expect(mockEq).toHaveBeenCalledWith(projects.workspaceId, 'workspace-2');
    expect(mockAnd).toHaveBeenCalledWith(
      { type: 'eq', column: projects.id, value: 'project-1' },
      { type: 'eq', column: projects.workspaceId, value: 'workspace-2' },
    );
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });
});
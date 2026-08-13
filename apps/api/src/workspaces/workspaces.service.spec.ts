import { db, workspaces } from '@seo/db';
import { eq } from 'drizzle-orm';
import { WorkspacesService } from './workspaces.service';

jest.mock('@seo/db', () => ({
  db: { update: jest.fn() },
  workspaces: { id: 'workspaces.id' },
  memberships: {},
  users: {},
}));

jest.mock('drizzle-orm', () => ({
  and: jest.fn(),
  eq: jest.fn((column: unknown, value: unknown) => ({ type: 'eq', column, value })),
}));

const mockUpdate = db.update as jest.Mock;
const mockEq = eq as jest.Mock;

function mockWorkspaceUpdate(result: unknown[]) {
  const returning = jest.fn().mockResolvedValue(result);
  const where = jest.fn(() => ({ returning }));
  const set = jest.fn(() => ({ where }));
  mockUpdate.mockReturnValue({ set });
  return { set, where, returning };
}

describe('WorkspacesService active tenant mutation scope', () => {
  const service = new WorkspacesService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates status using only the verified active workspace ID', async () => {
    const { set, where } = mockWorkspaceUpdate([{ id: 'workspace-1', status: 'suspended' }]);

    await expect(service.updateWorkspaceStatus('workspace-1', 'suspended')).resolves.toMatchObject({
      id: 'workspace-1',
      status: 'suspended',
    });

    expect(mockUpdate).toHaveBeenCalledWith(workspaces);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: 'suspended' }));
    expect(mockEq).toHaveBeenCalledWith(workspaces.id, 'workspace-1');
    expect(where).toHaveBeenCalledWith({ type: 'eq', column: workspaces.id, value: 'workspace-1' });
  });

  it('updates plan using only the verified active workspace ID', async () => {
    const { set, where } = mockWorkspaceUpdate([{ id: 'workspace-1', plan: 'pro' }]);

    await expect(service.updateWorkspacePlan('workspace-1', 'pro')).resolves.toMatchObject({
      id: 'workspace-1',
      plan: 'pro',
    });

    expect(mockUpdate).toHaveBeenCalledWith(workspaces);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ plan: 'pro' }));
    expect(mockEq).toHaveBeenCalledWith(workspaces.id, 'workspace-1');
    expect(where).toHaveBeenCalledWith({ type: 'eq', column: workspaces.id, value: 'workspace-1' });
  });
});
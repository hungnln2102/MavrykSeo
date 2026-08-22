import { db, projects, standardVersions, auditRuns, auditControls, auditControlResults } from '@seo/db';
import { eq, and } from 'drizzle-orm';
import { AuditsService } from './audits.service';
import { NotFoundException } from '@nestjs/common';

jest.mock('@seo/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn((cb) => cb(db)),
  },
  projects: { id: 'projects.id', workspaceId: 'projects.workspaceId' },
  standardVersions: { id: 'standardVersions.id', version: 'standardVersions.version' },
  auditRuns: { id: 'auditRuns.id', projectId: 'auditRuns.projectId', standardVersionId: 'auditRuns.standardVersionId', createdAt: 'auditRuns.createdAt' },
  auditControls: { id: 'auditControls.id', versionId: 'auditControls.versionId', code: 'auditControls.code', phase: 'auditControls.phase', description: 'auditControls.description', moduleId: 'auditControls.moduleId' },
  auditControlResults: { id: 'auditControlResults.id', auditRunId: 'auditControlResults.auditRunId', controlId: 'auditControlResults.controlId', result: 'auditControlResults.result', exceptionReason: 'auditControlResults.exceptionReason', reviewerId: 'auditControlResults.reviewerId', updatedAt: 'auditControlResults.updatedAt' },
  auditModules: { id: 'auditModules.id', code: 'auditModules.code', name: 'auditModules.name' },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((column: unknown, value: unknown) => ({ type: 'eq', column, value })),
  and: jest.fn((...conditions: unknown[]) => ({ type: 'and', conditions })),
  desc: jest.fn((column: unknown) => ({ type: 'desc', column })),
}));

const mockSelect = db.select as jest.Mock;
const mockInsert = db.insert as jest.Mock;
const mockUpdate = db.update as jest.Mock;

describe('AuditsService', () => {
  const service = new AuditsService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAuditRun', () => {
    it('throws NotFoundException if project does not exist within the workspace', async () => {
      // Mock projectCheck returning empty
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn(() => ({ limit: mockLimit }));
      mockSelect.mockReturnValue({ from: () => ({ where: mockWhere }) });

      await expect(service.createAuditRun('ws-1', 'proj-1', 'ver-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if standard version does not exist', async () => {
      // 1. Mock projectCheck returning project
      const mockLimitProj = jest.fn().mockResolvedValue([{ id: 'proj-1' }]);
      const mockWhereProj = jest.fn(() => ({ limit: mockLimitProj }));
      
      // 2. Mock versionCheck returning empty
      const mockLimitVer = jest.fn().mockResolvedValue([]);
      const mockWhereVer = jest.fn(() => ({ limit: mockLimitVer }));

      mockSelect
        .mockReturnValueOnce({ from: () => ({ where: mockWhereProj }) })
        .mockReturnValueOnce({ from: () => ({ where: mockWhereVer }) });

      await expect(service.createAuditRun('ws-1', 'proj-1', 'ver-1')).rejects.toThrow(NotFoundException);
    });

    it('creates an audit run and populates default results within a transaction', async () => {
      // 1. Mock projectCheck
      const mockLimitProj = jest.fn().mockResolvedValue([{ id: 'proj-1' }]);
      const mockWhereProj = jest.fn(() => ({ limit: mockLimitProj }));

      // 2. Mock versionCheck
      const mockLimitVer = jest.fn().mockResolvedValue([{ id: 'ver-1' }]);
      const mockWhereVer = jest.fn(() => ({ limit: mockLimitVer }));

      mockSelect
        .mockReturnValueOnce({ from: () => ({ where: mockWhereProj }) }) // project check
        .mockReturnValueOnce({ from: () => ({ where: mockWhereVer }) }); // version check

      // 3. Mock insert run chain
      const mockReturningRun = jest.fn().mockResolvedValue([{ id: 'run-1', projectId: 'proj-1', standardVersionId: 'ver-1' }]);
      const mockValuesRun = jest.fn(() => ({ returning: mockReturningRun }));
      mockInsert.mockReturnValueOnce({ values: mockValuesRun }); // auditRuns insert

      // 4. Mock select controls of version
      const mockWhereControls = jest.fn().mockResolvedValue([{ id: 'ctrl-1' }, { id: 'ctrl-2' }]);
      mockSelect.mockReturnValueOnce({ from: () => ({ where: mockWhereControls }) }); // select controls

      // 5. Mock control results bulk insert
      mockInsert.mockReturnValueOnce({ values: jest.fn().mockResolvedValue(null) });

      const newRun = await service.createAuditRun('ws-1', 'proj-1', 'ver-1');
      expect(newRun).toMatchObject({ id: 'run-1', projectId: 'proj-1', standardVersionId: 'ver-1' });
      expect(mockInsert).toHaveBeenCalledWith(auditRuns);
      expect(mockSelect).toHaveBeenCalledTimes(3); // 3rd select is controls selection
    });
  });

  describe('updateControlResult', () => {
    it('throws NotFoundException if result does not belong to user workspace', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn(() => ({ limit: mockLimit }));
      mockSelect.mockReturnValue({ from: () => ({ innerJoin: () => ({ innerJoin: () => ({ where: mockWhere }) }) }) });

      await expect(service.updateControlResult('ws-1', 'res-1', 'PASS')).rejects.toThrow(NotFoundException);
    });

    it('updates control result and returns the updated entity', async () => {
      // 1. Mock verification check
      const mockLimit = jest.fn().mockResolvedValue([{ id: 'res-1' }]);
      const mockWhereSelect = jest.fn(() => ({ limit: mockLimit }));
      mockSelect.mockReturnValue({ from: () => ({ innerJoin: () => ({ innerJoin: () => ({ where: mockWhereSelect }) }) }) });

      // 2. Mock update chain
      const mockReturning = jest.fn().mockResolvedValue([{ id: 'res-1', result: 'PASS' }]);
      const mockWhereUpdate = jest.fn(() => ({ returning: mockReturning }));
      const mockSet = jest.fn(() => ({ where: mockWhereUpdate }));
      mockUpdate.mockReturnValue({ set: mockSet });

      const updated = await service.updateControlResult('ws-1', 'res-1', 'PASS', 'exception text', 'user-1');
      expect(updated).toMatchObject({ id: 'res-1', result: 'PASS' });
      expect(mockUpdate).toHaveBeenCalledWith(auditControlResults);
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        result: 'PASS',
        exceptionReason: 'exception text',
        reviewerId: 'user-1',
      }));
    });
  });
});

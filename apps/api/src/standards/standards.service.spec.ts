import { db, standardVersions, auditRuns } from '@seo/db';
import { eq } from 'drizzle-orm';
import { StandardsService } from './standards.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('@seo/db', () => ({
  db: {
    select: jest.fn(),
    delete: jest.fn(),
  },
  standardVersions: { id: 'standardVersions.id', version: 'standardVersions.version' },
  auditControls: { id: 'auditControls.id', versionId: 'auditControls.versionId' },
  auditModules: { id: 'auditModules.id', code: 'auditModules.code' },
  auditRuns: { id: 'auditRuns.id', standardVersionId: 'auditRuns.standardVersionId' },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((column: unknown, value: unknown) => ({ type: 'eq', column, value })),
  sql: jest.fn(() => 'sql-stub'),
}));

const mockSelect = db.select as jest.Mock;
const mockDelete = db.delete as jest.Mock;
const mockEq = eq as jest.Mock;

describe('StandardsService Immutability Lock & Checklist API', () => {
  const service = new StandardsService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isVersionLocked', () => {
    it('returns true if standard version is used in at least one audit run', async () => {
      const mockLimit = jest.fn().mockResolvedValue([{ id: 'run-1' }]);
      const mockWhere = jest.fn(() => ({ limit: mockLimit }));
      const mockFrom = jest.fn(() => ({ where: mockWhere }));
      mockSelect.mockReturnValue({ from: mockFrom });

      const locked = await service.isVersionLocked('version-1');
      expect(locked).toBe(true);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith(auditRuns);
      expect(mockEq).toHaveBeenCalledWith(auditRuns.standardVersionId, 'version-1');
    });

    it('returns false if standard version has no linked audit runs', async () => {
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhere = jest.fn(() => ({ limit: mockLimit }));
      const mockFrom = jest.fn(() => ({ where: mockWhere }));
      mockSelect.mockReturnValue({ from: mockFrom });

      const locked = await service.isVersionLocked('version-2');
      expect(locked).toBe(false);
    });
  });

  describe('deleteVersion safety lock', () => {
    it('throws BadRequestException if standard version is locked', async () => {
      // Simulate isVersionLocked returning true
      const mockLimit = jest.fn().mockResolvedValue([{ id: 'run-1' }]);
      const mockWhere = jest.fn(() => ({ limit: mockLimit }));
      const mockFrom = jest.fn(() => ({ where: mockWhere }));
      mockSelect.mockReturnValue({ from: mockFrom });

      await expect(service.deleteVersion('version-1')).rejects.toThrow(BadRequestException);
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('deletes version and returns it if standard version is not locked', async () => {
      // 1. Simulate isVersionLocked returning false
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhereSelect = jest.fn(() => ({ limit: mockLimit }));
      const mockFromSelect = jest.fn(() => ({ where: mockWhereSelect }));
      mockSelect.mockReturnValue({ from: mockFromSelect });

      // 2. Mock delete chain
      const mockReturning = jest.fn().mockResolvedValue([{ id: 'version-1', version: '1.0' }]);
      const mockWhereDelete = jest.fn(() => ({ returning: mockReturning }));
      mockDelete.mockReturnValue({ where: mockWhereDelete });

      const result = await service.deleteVersion('version-1');
      expect(result).toMatchObject({ id: 'version-1', version: '1.0' });
      expect(mockDelete).toHaveBeenCalledWith(standardVersions);
      expect(mockEq).toHaveBeenCalledWith(standardVersions.id, 'version-1');
    });

    it('throws NotFoundException if the version to delete is not found', async () => {
      // 1. Simulate isVersionLocked returning false
      const mockLimit = jest.fn().mockResolvedValue([]);
      const mockWhereSelect = jest.fn(() => ({ limit: mockLimit }));
      const mockFromSelect = jest.fn(() => ({ where: mockWhereSelect }));
      mockSelect.mockReturnValue({ from: mockFromSelect });

      // 2. Mock delete returning empty array
      const mockReturning = jest.fn().mockResolvedValue([]);
      const mockWhereDelete = jest.fn(() => ({ returning: mockReturning }));
      mockDelete.mockReturnValue({ where: mockWhereDelete });

      await expect(service.deleteVersion('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});

import { of, lastValueFrom } from 'rxjs';
import { db } from '@seo/db';
import { AuditLogInterceptor } from './audit-log.interceptor';

jest.mock('@seo/db', () => ({
  db: { insert: jest.fn() },
  auditLogs: 'audit_logs',
}));

const mockInsert = db.insert as jest.Mock;

describe('AuditLogInterceptor', () => {
  const reflector = {
    get: jest.fn(),
  } as unknown as { get: jest.Mock } & import('@nestjs/core').Reflector;
  const interceptor = new AuditLogInterceptor(reflector);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes a successful mutation audit event without storing request body values', async () => {
    const values = jest.fn().mockResolvedValue(undefined);
    mockInsert.mockReturnValue({ values });
    (reflector.get as jest.Mock).mockReturnValue({
      action: 'recommendation.notes.update',
      entityType: 'recommendation',
    });
    const request = {
      user: { id: 'user-1' },
      workspaceId: 'workspace-1',
      params: { id: 'recommendation-1' },
      body: {
        internalNotes: 'Agency-only private note',
        clientNotes: 'Client-safe note',
      },
      headers: { 'user-agent': 'jest-agent' },
      ip: '127.0.0.1',
    };
    const context = {
      getHandler: () => 'handler',
      switchToHttp: () => ({ getRequest: () => request }),
    } as never;
    const next = { handle: () => of({ id: 'recommendation-1' }) } as never;

    await lastValueFrom(interceptor.intercept(context, next));
    await new Promise((resolve) => setImmediate(resolve));

    expect(values).toHaveBeenCalledWith({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      action: 'recommendation.notes.update',
      entityType: 'recommendation',
      entityId: 'recommendation-1',
      metadata: {
        ip: '127.0.0.1',
        userAgent: 'jest-agent',
        status: 'success',
        bodyKeys: ['internalNotes', 'clientNotes'],
      },
    });

    expect(JSON.stringify(values.mock.calls[0][0])).not.toContain('Agency-only private note');
    expect(JSON.stringify(values.mock.calls[0][0])).not.toContain('Client-safe note');
  });

  it('does not write an audit event when the handler fails', async () => {
    (reflector.get as jest.Mock).mockReturnValue({ action: 'site.crawl.request', entityType: 'site' });
    const context = {
      getHandler: () => 'handler',
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    } as never;
    const next = {
      handle: () => {
        throw new Error('Crawl unavailable');
      },
    } as never;

    expect(() => interceptor.intercept(context, next)).toThrow('Crawl unavailable');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
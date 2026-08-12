import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_METADATA_KEY = 'audit_log_metadata';

export interface AuditLogOptions {
  action: string;
  entityType?: string;
}

export const AuditLog = (action: string, entityType?: string) =>
  SetMetadata(AUDIT_LOG_METADATA_KEY, { action, entityType });

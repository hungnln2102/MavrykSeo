import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { db, auditLogs } from '@seo/db';
import { AUDIT_LOG_METADATA_KEY, AuditLogOptions } from './audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditLogOptions>(
      AUDIT_LOG_METADATA_KEY,
      context.getHandler()
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id; // set by AuthGuard
    const workspaceId = request.workspaceId || request.headers['x-workspace-id'];

    // Retrieve potential entity IDs from parameters or body
    const entityId = request.params?.id || 
                     request.params?.siteId || 
                     request.params?.projectId || 
                     request.params?.contentPlanId || 
                     request.body?.id || 
                     request.body?.projectId || 
                     request.body?.contentPlanId;

    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown-ip';
    const userAgent = request.headers['user-agent'] || 'unknown-agent';

    return next.handle().pipe(
      tap({
        next: async (response) => {
          try {
            // If the response returned an object with an ID, prioritize it as the entity ID
            const resolvedEntityId = response?.id || entityId;

            await db.insert(auditLogs).values({
              userId,
              workspaceId,
              action: auditOptions.action,
              entityType: auditOptions.entityType,
              entityId: resolvedEntityId ? String(resolvedEntityId) : null,
              metadata: {
                ip,
                userAgent,
                status: 'success',
                bodyKeys: request.body ? Object.keys(request.body) : [],
              },
            });
          } catch (err) {
            console.error('AuditLogInterceptor failed to save log:', err);
          }
        },
      })
    );
  }
}

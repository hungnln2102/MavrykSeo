import { CanActivate, ExecutionContext, Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { db, memberships, workspaces, supportSessions } from '@seo/db';
import { eq, and, gt } from 'drizzle-orm';

@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<any>();
    
    // Ensure user is authenticated first
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Extract workspace ID from header
    const workspaceId = request.headers['x-workspace-id'];
    if (!workspaceId) {
      throw new BadRequestException('Missing x-workspace-id header');
    }

    // Verify membership in the database
    let userRole: string | null = null;
    const existing = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, user.id),
          eq(memberships.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      userRole = existing[0].role;
    } else {
      // Fallback: Check if there is an active support session for this user & workspace
      const [session] = await db
        .select()
        .from(supportSessions)
        .where(
          and(
            eq(supportSessions.userId, user.id),
            eq(supportSessions.workspaceId, workspaceId),
            gt(supportSessions.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!session) {
        throw new ForbiddenException('User does not belong to this workspace');
      }

      // Valid support session active! Grant temporary admin role
      userRole = 'admin';
      request['isSupportSession'] = true;
      request['supportSessionId'] = session.id;
      request['supportReason'] = session.reason;
    }

    // Verify workspace plan & status
    const workspaceResult = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (workspaceResult.length === 0) {
      throw new BadRequestException('Workspace not found');
    }

    const activeWorkspace = workspaceResult[0];
    const requestUrl = request.url || '';
    const isAdministrativeRoute = requestUrl.includes('/status') || requestUrl.includes('/plan');
    if (activeWorkspace.status === 'suspended' && !isAdministrativeRoute) {
      throw new ForbiddenException('Workspace is suspended. Please contact support.');
    }

    // Inject active tenancy information into the request
    request['workspaceId'] = workspaceId;
    request['userRole'] = userRole;
    request['workspacePlan'] = activeWorkspace.plan;
    request['workspace'] = activeWorkspace;

    return true;
  }
}

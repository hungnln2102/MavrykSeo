import { CanActivate, ExecutionContext, Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { db, memberships, workspaces } from '@seo/db';
import { eq, and } from 'drizzle-orm';

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

    if (existing.length === 0) {
      throw new ForbiddenException('User does not belong to this workspace');
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
    const isAdministrativeRoute = request.url.includes('/status') || request.url.includes('/plan');
    if (activeWorkspace.status === 'suspended' && !isAdministrativeRoute) {
      throw new ForbiddenException('Workspace is suspended. Please contact support.');
    }

    // Inject active tenancy information into the request
    request['workspaceId'] = workspaceId;
    request['userRole'] = existing[0].role;
    request['workspacePlan'] = activeWorkspace.plan;
    request['workspace'] = activeWorkspace;

    return true;
  }
}

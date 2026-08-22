import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db, projects, projectMemberships } from '@seo/db';
import { eq, and } from 'drizzle-orm';
import { UserRole } from '@seo/core';

@Injectable()
export class ScopingHelper {
  /**
   * Helper to verify a project belongs to a workspace and return the project entity.
   */
  async scopeProjectQuery(workspaceId: string, projectId: string) {
    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (!project) {
      throw new NotFoundException('Project not found in this workspace.');
    }

    return project;
  }

  /**
   * Enforces project-level permission boundary.
   * - owner, admin, manager roles get implicit access automatically.
   * - other roles (seo, content, client, viewer) must have an active entry in project_memberships.
   */
  async assertProjectMember(userId: string, projectId: string, userWorkspaceRole: UserRole) {
    const isHighLevelRole = ['owner', 'admin', 'manager'].includes(userWorkspaceRole);
    if (isHighLevelRole) {
      return true;
    }

    const [pm] = await db
      .select()
      .from(projectMemberships)
      .where(
        and(
          eq(projectMemberships.projectId, projectId),
          eq(projectMemberships.userId, userId)
        )
      )
      .limit(1);

    if (!pm) {
      throw new ForbiddenException('Access denied. You do not have project-level membership for this project.');
    }

    return true;
  }

  /**
   * Redacts sensitive internal data (like internalNotes) if the caller has a client/viewer role.
   */
  redactInternalNotes<T extends Record<string, any>>(data: T | T[], role: UserRole): T | T[] {
    const isClientOrViewer = ['client', 'viewer'].includes(role);
    if (!isClientOrViewer) {
      return data;
    }

    const redactObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const copy = { ...obj };
      if ('internalNotes' in copy) {
        copy.internalNotes = null;
      }
      return copy;
    };

    if (Array.isArray(data)) {
      return data.map(redactObject);
    }

    return redactObject(data);
  }
}

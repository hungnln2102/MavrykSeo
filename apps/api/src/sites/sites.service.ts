import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db, sites, projects } from '@seo/db';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class SitesService {
  private async verifyProjectBelongsToWorkspace(workspaceId: string, projectId: string) {
    const projectResult = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found in this workspace');
    }
  }

  async createSite(workspaceId: string, projectId: string, domain: string) {
    // 1. Verify project-workspace match
    await this.verifyProjectBelongsToWorkspace(workspaceId, projectId);

    // 2. Insert site
    const [newSite] = await db.insert(sites).values({
      projectId,
      domain,
    }).returning();

    return newSite;
  }

  async getSites(workspaceId: string, projectId: string) {
    // 1. Verify project-workspace match
    await this.verifyProjectBelongsToWorkspace(workspaceId, projectId);

    // 2. Query sites
    const results = await db
      .select()
      .from(sites)
      .where(eq(sites.projectId, projectId));

    return results;
  }
}

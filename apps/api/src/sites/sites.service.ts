import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { db, sites, projects, workspaces } from '@seo/db';
import { eq, and, count } from 'drizzle-orm';

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

    // 2. Fetch workspace plan
    const workspaceResult = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (workspaceResult.length === 0) {
      throw new NotFoundException('Workspace not found');
    }

    const plan = workspaceResult[0].plan || 'free';

    // 3. Count current sites in the workspace
    const countResult = await db
      .select({ value: count() })
      .from(sites)
      .innerJoin(projects, eq(sites.projectId, projects.id))
      .where(eq(projects.workspaceId, workspaceId));

    const currentCount = countResult[0]?.value || 0;

    // 4. Validate quota
    let maxSites = 1;
    if (plan === 'pro') {
      maxSites = 10;
    } else if (plan === 'enterprise') {
      maxSites = 9999;
    }

    if (currentCount >= maxSites) {
      throw new BadRequestException(`Site limit reached for workspace plan '${plan}'. Upgrade required.`);
    }

    // 5. Insert site
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

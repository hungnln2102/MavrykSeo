import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { db, projects, workspaces } from '@seo/db';
import { eq, and, count } from 'drizzle-orm';

@Injectable()
export class ProjectsService {
  async createProject(workspaceId: string, name: string) {
    // 1. Fetch workspace to get plan
    const workspaceResult = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (workspaceResult.length === 0) {
      throw new NotFoundException('Workspace not found');
    }

    const plan = workspaceResult[0].plan || 'free';

    // 2. Count current projects in this workspace
    const countResult = await db
      .select({ value: count() })
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));

    const currentCount = countResult[0]?.value || 0;

    // 3. Validate quota
    let maxProjects = 1;
    if (plan === 'pro') {
      maxProjects = 5;
    } else if (plan === 'enterprise') {
      maxProjects = 9999;
    }

    if (currentCount >= maxProjects) {
      throw new BadRequestException(`Project limit reached for workspace plan '${plan}'. Upgrade required.`);
    }

    const [newProject] = await db.insert(projects).values({
      workspaceId,
      name,
    }).returning();
    
    return newProject;
  }

  async getProjects(workspaceId: string) {
    const results = await db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));
      
    return results;
  }

  async getProjectById(workspaceId: string, projectId: string) {
    const results = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException('Project not found in the active workspace');
    }

    return results[0];
  }
}

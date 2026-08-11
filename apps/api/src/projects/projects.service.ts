import { Injectable, NotFoundException } from '@nestjs/common';
import { db, projects } from '@seo/db';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class ProjectsService {
  async createProject(workspaceId: string, name: string) {
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

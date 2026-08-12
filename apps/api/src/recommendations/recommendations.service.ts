import { Injectable, NotFoundException } from '@nestjs/common';
import { db, recommendations, projects } from '@seo/db';
import { eq, and } from 'drizzle-orm';
import { UserRole } from '@seo/core';

@Injectable()
export class RecommendationsService {
  async getRecommendations(workspaceId: string, projectId: string, role: UserRole) {
    // Verify that the project belongs to this workspace and return recommendations
    const results = await db
      .select({
        id: recommendations.id,
        projectId: recommendations.projectId,
        title: recommendations.title,
        description: recommendations.description,
        status: recommendations.status,
        priority: recommendations.priority,
        impactScore: recommendations.impactScore,
        effortScore: recommendations.effortScore,
        internalNotes: recommendations.internalNotes,
        clientNotes: recommendations.clientNotes,
        createdAt: recommendations.createdAt,
        updatedAt: recommendations.updatedAt,
      })
      .from(recommendations)
      .innerJoin(projects, eq(recommendations.projectId, projects.id))
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(recommendations.projectId, projectId)
        )
      );

    const isAgencyStaff = ['owner', 'admin', 'manager', 'seo', 'content'].includes(role);

    return results.map((r) => ({
      ...r,
      internalNotes: isAgencyStaff ? r.internalNotes : null,
    }));
  }

  async updateRecommendationStatus(workspaceId: string, recommendationId: string, status: string) {
    // Enforce tenant boundary: check that the recommendation belongs to a project in the workspace
    const owningProject = await db
      .select({
        projectId: projects.id,
      })
      .from(recommendations)
      .innerJoin(projects, eq(recommendations.projectId, projects.id))
      .where(
        and(
          eq(recommendations.id, recommendationId),
          eq(projects.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (owningProject.length === 0) {
      throw new NotFoundException('Recommendation not found in this workspace');
    }

    const [updated] = await db
      .update(recommendations)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(recommendations.id, recommendationId))
      .returning();

    return updated;
  }
}

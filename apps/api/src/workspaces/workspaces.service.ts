import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { db, workspaces, memberships, users } from '@seo/db';
import { eq, and } from 'drizzle-orm';
import { UserRole } from '@seo/core';

@Injectable()
export class WorkspacesService {
  async createWorkspace(userId: string, name: string, slug: string) {
    // Check if slug is unique
    const existing = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
    if (existing.length > 0) {
      throw new ConflictException('Workspace slug is already in use');
    }

    // Run transaction
    return await db.transaction(async (tx) => {
      // 1. Create workspace
      const [newWorkspace] = await tx.insert(workspaces).values({
        name,
        slug,
      }).returning();

      // 2. Create membership
      await tx.insert(memberships).values({
        userId,
        workspaceId: newWorkspace.id,
        role: 'owner',
      });

      return newWorkspace;
    });
  }

  async getWorkspacesForUser(userId: string) {
    // Query workspaces where user is a member
    const results = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
      })
      .from(memberships)
      .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
      .where(eq(memberships.userId, userId));

    return results;
  }

  async getWorkspaceMembers(workspaceId: string) {
    // Query members of a workspace
    const results = await db
      .select({
        membershipId: memberships.id,
        role: memberships.role,
        joinedAt: memberships.createdAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.workspaceId, workspaceId));

    return results;
  }

  async addWorkspaceMember(workspaceId: string, email: string, role: UserRole) {
    // Find or create user
    let userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let userId: string;

    if (userResult.length === 0) {
      // Create a user
      const [newUser] = await db.insert(users).values({
        email,
        name: email.split('@')[0],
      }).returning();
      userId = newUser.id;
    } else {
      userId = userResult[0].id;
    }

    // Check if membership already exists
    const existingMembership = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (existingMembership.length > 0) {
      throw new ConflictException('User is already a member of this workspace');
    }

    // Add membership
    const [newMembership] = await db.insert(memberships).values({
      userId,
      workspaceId,
      role,
    }).returning();

    return newMembership;
  }

  async updateWorkspaceStatus(workspaceId: string, status: string) {
    const [updated] = await db
      .update(workspaces)
      .set({ status, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Workspace not found');
    }
    return updated;
  }

  async updateWorkspacePlan(workspaceId: string, plan: string) {
    const [updated] = await db
      .update(workspaces)
      .set({ plan, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Workspace not found');
    }
    return updated;
  }

  async updateWorkspaceWhiteLabel(id: string, logo: string, colors: any) {
    const [updated] = await db
      .update(workspaces)
      .set({ whiteLabelLogo: logo, whiteLabelColors: colors, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Workspace not found');
    }
    return {
      whiteLabelLogo: updated.whiteLabelLogo,
      whiteLabelColors: updated.whiteLabelColors,
    };
  }

  async getWorkspaceWhiteLabel(id: string) {
    const workspace = await db
      .select({
        whiteLabelLogo: workspaces.whiteLabelLogo,
        whiteLabelColors: workspaces.whiteLabelColors,
      })
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);

    if (workspace.length === 0) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace[0];
  }
}

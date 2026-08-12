import { Injectable, NotFoundException } from '@nestjs/common';
import { db, integrations, projects } from '@seo/db';
import { eq, and } from 'drizzle-orm';
import { encryptToken, decryptToken } from '@seo/core';

@Injectable()
export class IntegrationsService {
  async saveIntegration(workspaceId: string, projectId: string, provider: string, credentials: any) {
    // 1. Verify project belongs to workspace
    const projectResult = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found in this workspace');
    }

    // 2. Encrypt credentials
    const credentialString = JSON.stringify(credentials);
    const encryptedCredentials = encryptToken(credentialString);

    // 3. Check if integration already exists
    const existingResult = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.projectId, projectId), eq(integrations.provider, provider)))
      .limit(1);

    if (existingResult.length > 0) {
      // Update
      const [updated] = await db
        .update(integrations)
        .set({
          credentials: encryptedCredentials,
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existingResult[0].id))
        .returning();
      return { id: updated.id, provider: updated.provider, status: updated.status };
    } else {
      // Insert
      const [inserted] = await db
        .insert(integrations)
        .values({
          projectId,
          provider,
          credentials: encryptedCredentials,
        })
        .returning();
      return { id: inserted.id, provider: inserted.provider, status: inserted.status };
    }
  }

  async getIntegration(workspaceId: string, projectId: string, provider: string) {
    // 1. Verify project belongs to workspace
    const projectResult = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found in this workspace');
    }

    // 2. Retrieve integration
    const result = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.projectId, projectId), eq(integrations.provider, provider)))
      .limit(1);

    if (result.length === 0) {
      throw new NotFoundException(`Integration '${provider}' not found for this project`);
    }

    const integration = result[0];

    // 3. Decrypt credentials
    let decryptedCredentials: any;
    try {
      const decryptedString = decryptToken(integration.credentials);
      decryptedCredentials = JSON.parse(decryptedString);
    } catch (err) {
      throw new Error(`Failed to decrypt integration credentials: ${err.message}`);
    }

    return {
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      credentials: decryptedCredentials,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    };
  }
}

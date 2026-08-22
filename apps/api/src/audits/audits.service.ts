import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { db, projects, standardVersions, auditRuns, auditControls, auditControlResults, auditModules } from '@seo/db';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class AuditsService {
  async createAuditRun(workspaceId: string, projectId: string, standardVersionId: string, scopeSnapshot?: any) {
    // 1. Verify project belongs to workspace
    const projectCheck = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectCheck.length === 0) {
      throw new NotFoundException('Project not found');
    }

    // 2. Verify standard version exists
    const versionCheck = await db
      .select()
      .from(standardVersions)
      .where(eq(standardVersions.id, standardVersionId))
      .limit(1);

    if (versionCheck.length === 0) {
      throw new NotFoundException('Standard version not found');
    }

    // 3. Create run and snapshot controls in a transaction
    return await db.transaction(async (tx) => {
      // 3.1. Insert audit run
      const [newRun] = await tx
        .insert(auditRuns)
        .values({
          projectId,
          standardVersionId,
          status: 'active',
          scopeSnapshot: scopeSnapshot || {},
        })
        .returning();

      // 3.2. Fetch all controls inside standard version
      const versionControls = await tx
        .select({ id: auditControls.id })
        .from(auditControls)
        .where(eq(auditControls.versionId, standardVersionId));

      // 3.3. Bulk insert default results as NEED_DATA
      if (versionControls.length > 0) {
        const valuesToInsert = versionControls.map((ctrl) => ({
          auditRunId: newRun.id,
          controlId: ctrl.id,
          result: 'NEED_DATA',
        }));

        await tx.insert(auditControlResults).values(valuesToInsert);
      }

      return newRun;
    });
  }

  async getAuditRuns(workspaceId: string, projectId: string) {
    // Verify project belongs to workspace
    const projectCheck = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectCheck.length === 0) {
      throw new NotFoundException('Project not found');
    }

    return await db
      .select({
        id: auditRuns.id,
        projectId: auditRuns.projectId,
        standardVersionId: auditRuns.standardVersionId,
        status: auditRuns.status,
        scopeSnapshot: auditRuns.scopeSnapshot,
        createdAt: auditRuns.createdAt,
        updatedAt: auditRuns.updatedAt,
        standardVersion: {
          version: standardVersions.version,
        },
      })
      .from(auditRuns)
      .innerJoin(standardVersions, eq(auditRuns.standardVersionId, standardVersions.id))
      .where(eq(auditRuns.projectId, projectId))
      .orderBy(desc(auditRuns.createdAt));
  }

  async getAuditRunResults(workspaceId: string, auditRunId: string) {
    // 1. Verify audit run belongs to workspace
    const runCheck = await db
      .select({ id: auditRuns.id })
      .from(auditRuns)
      .innerJoin(projects, eq(auditRuns.projectId, projects.id))
      .where(and(eq(auditRuns.id, auditRunId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (runCheck.length === 0) {
      throw new NotFoundException('Audit run not found or access denied');
    }

    // 2. Fetch all snapshot control results of audit run
    return await db
      .select({
        id: auditControlResults.id,
        auditRunId: auditControlResults.auditRunId,
        result: auditControlResults.result,
        exceptionReason: auditControlResults.exceptionReason,
        reviewerId: auditControlResults.reviewerId,
        updatedAt: auditControlResults.updatedAt,
        controlId: auditControls.id,
        controlCode: auditControls.code,
        controlPhase: auditControls.phase,
        controlDescription: auditControls.description,
        moduleId: auditModules.id,
        moduleCode: auditModules.code,
        moduleName: auditModules.name,
      })
      .from(auditControlResults)
      .innerJoin(auditControls, eq(auditControlResults.controlId, auditControls.id))
      .innerJoin(auditModules, eq(auditControls.moduleId, auditModules.id))
      .where(eq(auditControlResults.auditRunId, auditRunId))
      .orderBy(auditModules.code, auditControls.code);
  }

  async updateControlResult(
    workspaceId: string,
    resultId: string,
    result: string,
    exceptionReason?: string,
    reviewerId?: string
  ) {
    // 1. Verify the result belongs to project in this workspace
    const check = await db
      .select({ id: auditControlResults.id })
      .from(auditControlResults)
      .innerJoin(auditRuns, eq(auditControlResults.auditRunId, auditRuns.id))
      .innerJoin(projects, eq(auditRuns.projectId, projects.id))
      .where(and(eq(auditControlResults.id, resultId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (check.length === 0) {
      throw new NotFoundException('Control result not found or access denied');
    }

    const [updated] = await db
      .update(auditControlResults)
      .set({
        result,
        exceptionReason: exceptionReason || null,
        reviewerId: reviewerId || null,
        updatedAt: new Date(),
      })
      .where(eq(auditControlResults.id, resultId))
      .returning();

    return updated;
  }
}

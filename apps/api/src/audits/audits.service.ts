import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { db, projects, standardVersions, auditRuns, auditControls, auditControlResults, auditModules, projectScopes, sites, jobRuns } from '@seo/db';
import { eq, and, desc } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { createJobEnvelope } from '@seo/core';

@Injectable()
export class AuditsService {
  private crawlerQueue: Queue;

  constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    this.crawlerQueue = new Queue('crawler-queue', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });
  }
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

    // Fetch site type of the project
    const projectScopeCheck = await db
      .select({ siteType: projectScopes.siteType })
      .from(projectScopes)
      .where(eq(projectScopes.projectId, projectId))
      .limit(1);

    const siteType = projectScopeCheck[0]?.siteType || 'core';

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
        .select({
          id: auditControls.id,
          code: auditControls.code,
          applicability: auditControls.applicability,
        })
        .from(auditControls)
        .where(eq(auditControls.versionId, standardVersionId));

      // 3.3. Bulk insert default results
      if (versionControls.length > 0) {
        const valuesToInsert = versionControls.map((ctrl) => {
          const appList = ctrl.applicability || [];
          const isApplicable =
            appList.length === 0 ||
            appList.includes('core') ||
            appList.includes(siteType);

          return {
            auditRunId: newRun.id,
            controlId: ctrl.id,
            result: isApplicable ? 'NEED_DATA' : 'NOT_APPLICABLE',
            exceptionReason: isApplicable
              ? null
              : `Control applicability profile [${appList.join(', ')}] does not apply to project site type: ${siteType}`,
          };
        });

        await tx.insert(auditControlResults).values(valuesToInsert);
      }

      // 3.4. Trigger automated crawl job for all sites in this project
      const projectSites = await tx
        .select({ id: sites.id, domain: sites.domain })
        .from(sites)
        .where(eq(sites.projectId, projectId));

      for (const site of projectSites) {
        const runKey = `audit-run-${newRun.id}-${Math.floor(Date.now() / 1000)}`;
        const envelope = createJobEnvelope('crawl.requested', [workspaceId, site.id, runKey]);
        const jobData = {
          ...envelope,
          workspaceId,
          siteId: site.id,
          ingestionKey: envelope.idempotencyKey,
        };

        try {
          const [createdJobRun] = await tx
            .insert(jobRuns)
            .values({
              workspaceId,
              projectId,
              queueName: 'crawler-queue',
              jobName: 'crawl.requested',
              bullmqJobId: envelope.idempotencyKey,
              idempotencyKey: envelope.idempotencyKey,
              correlationId: envelope.correlationId,
              state: 'queued',
              attemptCount: 0,
              maxAttempts: 3,
              ingestionKey: envelope.idempotencyKey,
              payload: jobData,
            })
            .onConflictDoNothing()
            .returning({ id: jobRuns.id });

          if (createdJobRun) {
            await this.crawlerQueue.add('crawl.requested', jobData, {
              jobId: envelope.idempotencyKey,
              attempts: 3,
              backoff: { type: 'exponential', delay: 1000 },
              removeOnComplete: 1000,
              removeOnFail: 5000,
            });
            console.log(`Enqueued crawl for site ${site.domain} via audit run ${newRun.id}`);
          }
        } catch (crawlErr: any) {
          console.error(`Failed to trigger crawl for site ${site.domain}:`, crawlErr.message);
        }
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

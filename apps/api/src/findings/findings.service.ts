import { Injectable, NotFoundException } from '@nestjs/common';
import { db, findings, observations, findingObservations, affectedEntities, projects } from '@seo/db';
import { eq, and } from 'drizzle-orm';
import { CreateFindingDto, CreateObservationDto } from './dto/findings.dto';

@Injectable()
export class FindingsService {
  async createFinding(workspaceId: string, dto: CreateFindingDto) {
    // 1. Verify project belongs to workspace
    const projectCheck = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, dto.projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);
    
    if (projectCheck.length === 0) {
      throw new NotFoundException('Project not found in this workspace');
    }

    return await db.transaction(async (tx) => {
      // Check if finding already exists
      const existing = await tx
        .select()
        .from(findings)
        .where(
          and(
            eq(findings.projectId, dto.projectId),
            eq(findings.controlCode, dto.controlCode),
            eq(findings.rootCauseKey, dto.rootCauseKey),
            eq(findings.normalizedScopeHash, dto.normalizedScopeHash)
          )
        )
        .limit(1);

      let findingId: string;
      let resultFinding: any;

      if (existing.length > 0) {
        findingId = existing[0].id;
        const [updated] = await tx
          .update(findings)
          .set({
            status: dto.status || 'open',
            severity: dto.severity,
            confidence: dto.confidence || 'medium',
            updatedAt: new Date(),
          })
          .where(eq(findings.id, findingId))
          .returning();
        resultFinding = updated;
      } else {
        const [inserted] = await tx
          .insert(findings)
          .values({
            projectId: dto.projectId,
            controlCode: dto.controlCode,
            rootCauseKey: dto.rootCauseKey,
            normalizedScopeHash: dto.normalizedScopeHash,
            severity: dto.severity,
            confidence: dto.confidence || 'medium',
            status: dto.status || 'open',
          })
          .returning();
        findingId = inserted.id;
        resultFinding = inserted;
      }

      // Sync affected entities (URLs)
      if (dto.affectedUrls && dto.affectedUrls.length > 0) {
        const existingEntities = await tx
          .select({ entityIdOrUrl: affectedEntities.entityIdOrUrl })
          .from(affectedEntities)
          .where(eq(affectedEntities.findingId, findingId));

        const existingUrlsSet = new Set(existingEntities.map(e => e.entityIdOrUrl));

        const urlsToInsert = dto.affectedUrls
          .filter(url => !existingUrlsSet.has(url))
          .map(url => ({
            findingId,
            entityType: 'url',
            entityIdOrUrl: url,
          }));

        if (urlsToInsert.length > 0) {
          await tx.insert(affectedEntities).values(urlsToInsert);
        }
      }

      // Sync observations mapping
      if (dto.observations && dto.observations.length > 0) {
        const existingMappings = await tx
          .select({ observationId: findingObservations.observationId })
          .from(findingObservations)
          .where(eq(findingObservations.findingId, findingId));

        const existingObsSet = new Set(existingMappings.map(m => m.observationId));

        const mappingsToInsert = dto.observations
          .filter(obsId => !existingObsSet.has(obsId))
          .map(obsId => ({
            findingId,
            observationId: obsId,
          }));

        if (mappingsToInsert.length > 0) {
          await tx.insert(findingObservations).values(mappingsToInsert);
        }
      }

      return resultFinding;
    });
  }

  async getFindings(workspaceId: string, projectId: string, status?: string, severity?: string) {
    const projectCheck = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectCheck.length === 0) {
      throw new NotFoundException('Project not found in this workspace');
    }

    const conditions = [
      eq(projects.workspaceId, workspaceId),
      eq(findings.projectId, projectId),
    ];

    if (status) {
      conditions.push(eq(findings.status, status));
    }
    if (severity) {
      conditions.push(eq(findings.severity, severity));
    }

    return await db
      .select({
        id: findings.id,
        projectId: findings.projectId,
        controlCode: findings.controlCode,
        rootCauseKey: findings.rootCauseKey,
        normalizedScopeHash: findings.normalizedScopeHash,
        severity: findings.severity,
        confidence: findings.confidence,
        status: findings.status,
        createdAt: findings.createdAt,
        updatedAt: findings.updatedAt,
      })
      .from(findings)
      .innerJoin(projects, eq(findings.projectId, projects.id))
      .where(and(...conditions));
  }

  async updateFindingStatus(workspaceId: string, findingId: string, status: string) {
    const check = await db
      .select({ id: findings.id })
      .from(findings)
      .innerJoin(projects, eq(findings.projectId, projects.id))
      .where(and(eq(findings.id, findingId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (check.length === 0) {
      throw new NotFoundException('Finding not found in this workspace');
    }

    const [updated] = await db
      .update(findings)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(findings.id, findingId))
      .returning();

    return updated;
  }

  async getAffectedEntities(workspaceId: string, findingId: string) {
    const check = await db
      .select({ id: findings.id })
      .from(findings)
      .innerJoin(projects, eq(findings.projectId, projects.id))
      .where(and(eq(findings.id, findingId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (check.length === 0) {
      throw new NotFoundException('Finding not found in this workspace');
    }

    return await db
      .select()
      .from(affectedEntities)
      .where(eq(affectedEntities.findingId, findingId));
  }

  async createObservation(workspaceId: string, dto: CreateObservationDto) {
    const projectCheck = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, dto.projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectCheck.length === 0) {
      throw new NotFoundException('Project not found in this workspace');
    }

    const [inserted] = await db
      .insert(observations)
      .values({
        workspaceId,
        projectId: dto.projectId,
        sourceType: dto.sourceType,
        sourceRef: dto.sourceRef,
        classification: dto.classification,
        data: dto.data || {},
      })
      .returning();

    return inserted;
  }

  async getObservations(workspaceId: string, projectId: string) {
    const projectCheck = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectCheck.length === 0) {
      throw new NotFoundException('Project not found in this workspace');
    }

    return await db
      .select()
      .from(observations)
      .where(and(eq(observations.projectId, projectId), eq(observations.workspaceId, workspaceId)));
  }
}

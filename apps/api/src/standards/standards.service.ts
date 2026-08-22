import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { db, standardVersions, auditControls, auditModules, auditRuns } from '@seo/db';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class StandardsService {
  async getVersions() {
    return await db
      .select({
        id: standardVersions.id,
        version: standardVersions.version,
        effectiveAt: standardVersions.effectiveAt,
        status: standardVersions.status,
        sourceManifestHash: standardVersions.sourceManifestHash,
        createdAt: standardVersions.createdAt,
        controlCount: sql<number>`count(${auditControls.id})::int`,
      })
      .from(standardVersions)
      .leftJoin(auditControls, eq(standardVersions.id, auditControls.versionId))
      .groupBy(
        standardVersions.id,
        standardVersions.version,
        standardVersions.effectiveAt,
        standardVersions.status,
        standardVersions.sourceManifestHash,
        standardVersions.createdAt
      )
      .orderBy(standardVersions.version);
  }

  async getVersionControls(versionId: string) {
    const checkVersion = await db
      .select()
      .from(standardVersions)
      .where(eq(standardVersions.id, versionId))
      .limit(1);

    if (checkVersion.length === 0) {
      throw new NotFoundException('Standard version not found');
    }

    const controls = await db
      .select({
        id: auditControls.id,
        code: auditControls.code,
        phase: auditControls.phase,
        description: auditControls.description,
        module: {
          id: auditModules.id,
          code: auditModules.code,
          name: auditModules.name,
          description: auditModules.description,
        },
      })
      .from(auditControls)
      .innerJoin(auditModules, eq(auditControls.moduleId, auditModules.id))
      .where(eq(auditControls.versionId, versionId))
      .orderBy(auditModules.code, auditControls.code);

    return {
      version: checkVersion[0],
      controls,
    };
  }

  async isVersionLocked(versionId: string): Promise<boolean> {
    const runs = await db
      .select({ id: auditRuns.id })
      .from(auditRuns)
      .where(eq(auditRuns.standardVersionId, versionId))
      .limit(1);
    return runs.length > 0;
  }

  async deleteVersion(versionId: string) {
    const isLocked = await this.isVersionLocked(versionId);
    if (isLocked) {
      throw new BadRequestException('Immutability lock triggered: Standard version is linked to historical audit runs.');
    }

    const [deleted] = await db
      .delete(standardVersions)
      .where(eq(standardVersions.id, versionId))
      .returning();

    if (!deleted) {
      throw new NotFoundException('Standard version not found');
    }

    return deleted;
  }
}

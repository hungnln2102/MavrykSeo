import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { ScopingHelper } from './scoping.helper';
import { UserRole } from '@seo/core';
import { db, sites, recommendations, reports, keywords, auditRuns, topics, contentPlans, briefs, auditControlResults, findings, actions } from '@seo/db';
import { eq } from 'drizzle-orm';

@Injectable()
export class ProjectGuard implements CanActivate {
  constructor(private readonly scopingHelper: ScopingHelper) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<any>();
    
    // Ensure TenantGuard has run first to populate workspace details
    const workspaceId = request.workspaceId;
    const userRole = request.userRole as UserRole;
    const user = request.user;

    if (!user || !workspaceId || !userRole) {
      throw new ForbiddenException('Tenant access must be verified before verifying project permissions.');
    }

    // 1. Try to resolve projectId directly from parameters, body, or headers
    let projectId = request.params?.projectId ||
                    request.body?.projectId ||
                    request.query?.projectId ||
                    request.headers['x-project-id'];

    const path = request.url || '';

    // 2. If not found directly, check if we're referencing a sub-resource ID and resolve its project ID
    if (!projectId) {
      const idParam = request.params?.id || request.params?.siteId || request.params?.recommendationId || request.params?.reportId || request.params?.keywordId || request.params?.auditRunId || request.params?.topicId || request.params?.contentPlanId || request.params?.briefId;
      
      if (idParam) {
        if (path.includes('/sites/')) {
          const [res] = await db.select({ projectId: sites.projectId }).from(sites).where(eq(sites.id, idParam)).limit(1);
          projectId = res?.projectId;
        } else if (path.includes('/recommendations/')) {
          const [res] = await db.select({ projectId: recommendations.projectId }).from(recommendations).where(eq(recommendations.id, idParam)).limit(1);
          projectId = res?.projectId;
        } else if (path.includes('/reports/')) {
          const [res] = await db.select({ projectId: reports.projectId }).from(reports).where(eq(reports.id, idParam)).limit(1);
          projectId = res?.projectId;
        } else if (path.includes('/keywords/')) {
          const [res] = await db.select({ projectId: keywords.projectId }).from(keywords).where(eq(keywords.id, idParam)).limit(1);
          projectId = res?.projectId;
        } else if (path.includes('/control-results/') || path.includes('/audit-control-results/')) {
          const [res] = await db
            .select({ projectId: auditRuns.projectId })
            .from(auditControlResults)
            .innerJoin(auditRuns, eq(auditControlResults.auditRunId, auditRuns.id))
            .where(eq(auditControlResults.id, idParam))
            .limit(1);
          projectId = res?.projectId;
        } else if (path.includes('/audits/run') || path.includes('/audit-runs/')) {
          const [res] = await db.select({ projectId: auditRuns.projectId }).from(auditRuns).where(eq(auditRuns.id, idParam)).limit(1);
          projectId = res?.projectId;
        } else if (path.includes('/topics/')) {
          const [res] = await db.select({ projectId: topics.projectId }).from(topics).where(eq(topics.id, idParam)).limit(1);
          projectId = res?.projectId;
        } else if (path.includes('/content/plans/') || path.includes('/content/plan')) {
          const [res] = await db.select({ projectId: contentPlans.projectId }).from(contentPlans).where(eq(contentPlans.id, idParam)).limit(1);
          projectId = res?.projectId;
        } else if (path.includes('/content/briefs/') || path.includes('/content/brief')) {
          const [res] = await db.select({ projectId: briefs.projectId }).from(briefs).where(eq(briefs.id, idParam)).limit(1);
          projectId = res?.projectId;
        } else if (path.includes('/findings/')) {
          const [res] = await db.select({ projectId: findings.projectId }).from(findings).where(eq(findings.id, idParam)).limit(1);
          projectId = res?.projectId;
        } else if (path.includes('/actions/')) {
          const [res] = await db.select({ projectId: actions.projectId }).from(actions).where(eq(actions.id, idParam)).limit(1);
          projectId = res?.projectId;
        }
      }
    }

    // 3. Fallback: if route was `/projects/:id`, then `:id` is the projects.id
    if (!projectId && request.params?.id && path.includes('/projects/')) {
      projectId = request.params.id;
    }

    if (!projectId) {
      throw new ForbiddenException('Project context could not be resolved.');
    }

    // 4. Verify project belongs to workspace
    await this.scopingHelper.scopeProjectQuery(workspaceId, projectId);

    // 5. Verify user has project-level membership (except for workspace wide owners/admins/managers)
    await this.scopingHelper.assertProjectMember(user.id, projectId, userRole);

    return true;
  }
}

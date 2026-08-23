import { Injectable, NotFoundException } from '@nestjs/common';
import { db, actions, actionFindings, actionDependencies, actionComments, actionApprovals, verificationRecords, projects, findings } from '@seo/db';
import { eq, and } from 'drizzle-orm';
import { UserRole } from '@seo/core';
import { CreateActionDto, CreateActionCommentDto, CreateActionApprovalDto, CreateActionVerificationDto } from './dto/actions.dto';

@Injectable()
export class ActionsService {
  async createAction(workspaceId: string, userId: string, dto: CreateActionDto) {
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
      // 2. Create action
      const [newAction] = await tx
        .insert(actions)
        .values({
          projectId: dto.projectId,
          title: dto.title,
          description: dto.description || null,
          status: dto.status || 'proposed',
          priority: dto.priority || 'medium',
          ownerId: dto.ownerId || null,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        })
        .returning();

      // 3. Link findings
      if (dto.findingIds && dto.findingIds.length > 0) {
        // Enforce that findingIds actually belong to this project
        const validFindings = await tx
          .select({ id: findings.id })
          .from(findings)
          .where(and(eq(findings.projectId, dto.projectId)));

        const validIdsSet = new Set(validFindings.map((f) => f.id));
        const links = dto.findingIds
          .filter((fid) => validIdsSet.has(fid))
          .map((fid) => ({
            actionId: newAction.id,
            findingId: fid,
          }));

        if (links.length > 0) {
          await tx.insert(actionFindings).values(links);
        }
      }

      // 4. Link dependencies
      if (dto.dependencies && dto.dependencies.length > 0) {
        // Enforce that dependent actionIds belong to this project
        const validActions = await tx
          .select({ id: actions.id })
          .from(actions)
          .where(eq(actions.projectId, dto.projectId));
        
        const validActionsSet = new Set(validActions.map((a) => a.id));
        const deps = dto.dependencies
          .filter((aid) => validActionsSet.has(aid))
          .map((aid) => ({
            actionId: newAction.id,
            dependsOnActionId: aid,
          }));

        if (deps.length > 0) {
          await tx.insert(actionDependencies).values(deps);
        }
      }

      return newAction;
    });
  }

  async getActions(workspaceId: string, projectId: string, status?: string, priority?: string) {
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
      eq(actions.projectId, projectId),
    ];

    if (status) {
      conditions.push(eq(actions.status, status));
    }
    if (priority) {
      conditions.push(eq(actions.priority, priority));
    }

    return await db
      .select({
        id: actions.id,
        projectId: actions.projectId,
        title: actions.title,
        description: actions.description,
        status: actions.status,
        priority: actions.priority,
        ownerId: actions.ownerId,
        approverId: actions.approverId,
        dueAt: actions.dueAt,
        createdAt: actions.createdAt,
        updatedAt: actions.updatedAt,
      })
      .from(actions)
      .innerJoin(projects, eq(actions.projectId, projects.id))
      .where(and(...conditions));
  }

  async getActionDetails(workspaceId: string, actionId: string, role: UserRole) {
    const actionCheck = await db
      .select({
        id: actions.id,
        projectId: actions.projectId,
        title: actions.title,
        description: actions.description,
        status: actions.status,
        priority: actions.priority,
        ownerId: actions.ownerId,
        approverId: actions.approverId,
        dueAt: actions.dueAt,
        createdAt: actions.createdAt,
        updatedAt: actions.updatedAt,
      })
      .from(actions)
      .innerJoin(projects, eq(actions.projectId, projects.id))
      .where(and(eq(actions.id, actionId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (actionCheck.length === 0) {
      throw new NotFoundException('Action not found in this workspace');
    }

    const action = actionCheck[0];

    // Fetch findings
    const findingsList = await db
      .select({
        id: findings.id,
        controlCode: findings.controlCode,
        rootCauseKey: findings.rootCauseKey,
        severity: findings.severity,
        status: findings.status,
      })
      .from(actionFindings)
      .innerJoin(findings, eq(actionFindings.findingId, findings.id))
      .where(eq(actionFindings.actionId, actionId));

    // Fetch dependencies
    const depsList = await db
      .select({
        dependsOnActionId: actionDependencies.dependsOnActionId,
      })
      .from(actionDependencies)
      .where(eq(actionDependencies.actionId, actionId));

    // Fetch comments
    const isAgencyStaff = ['owner', 'admin', 'manager', 'seo', 'content'].includes(role);
    const commentConditions = [eq(actionComments.actionId, actionId)];
    if (!isAgencyStaff) {
      commentConditions.push(eq(actionComments.isClientVisible, true));
    }

    const comments = await db
      .select({
        id: actionComments.id,
        userId: actionComments.userId,
        comment: actionComments.comment,
        isClientVisible: actionComments.isClientVisible,
        createdAt: actionComments.createdAt,
      })
      .from(actionComments)
      .where(and(...commentConditions));

    // Fetch approvals
    const approvals = await db
      .select({
        id: actionApprovals.id,
        approverId: actionApprovals.approverId,
        status: actionApprovals.status,
        notes: actionApprovals.notes,
        createdAt: actionApprovals.createdAt,
      })
      .from(actionApprovals)
      .where(eq(actionApprovals.actionId, actionId));

    // Fetch verifications
    const verifications = await db
      .select({
        id: verificationRecords.id,
        verifierId: verificationRecords.verifierId,
        result: verificationRecords.result,
        criteriaSnapshot: verificationRecords.criteriaSnapshot,
        evidence: verificationRecords.evidence,
        createdAt: verificationRecords.createdAt,
      })
      .from(verificationRecords)
      .where(eq(verificationRecords.actionId, actionId));

    return {
      ...action,
      findings: findingsList,
      dependencies: depsList.map((d) => d.dependsOnActionId),
      comments,
      approvals,
      verificationRecords: verifications,
    };
  }

  async updateActionStatus(workspaceId: string, actionId: string, status: string) {
    const actionCheck = await db
      .select({ id: actions.id })
      .from(actions)
      .innerJoin(projects, eq(actions.projectId, projects.id))
      .where(and(eq(actions.id, actionId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (actionCheck.length === 0) {
      throw new NotFoundException('Action not found in this workspace');
    }

    const [updated] = await db
      .update(actions)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(actions.id, actionId))
      .returning();

    return updated;
  }

  async addComment(workspaceId: string, userId: string, actionId: string, dto: CreateActionCommentDto) {
    const actionCheck = await db
      .select({ id: actions.id })
      .from(actions)
      .innerJoin(projects, eq(actions.projectId, projects.id))
      .where(and(eq(actions.id, actionId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (actionCheck.length === 0) {
      throw new NotFoundException('Action not found in this workspace');
    }

    const [newComment] = await db
      .insert(actionComments)
      .values({
        actionId,
        userId,
        comment: dto.comment,
        isClientVisible: dto.isClientVisible ?? false,
      })
      .returning();

    return newComment;
  }

  async addApproval(workspaceId: string, userId: string, actionId: string, dto: CreateActionApprovalDto) {
    const actionCheck = await db
      .select({ id: actions.id })
      .from(actions)
      .innerJoin(projects, eq(actions.projectId, projects.id))
      .where(and(eq(actions.id, actionId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (actionCheck.length === 0) {
      throw new NotFoundException('Action not found in this workspace');
    }

    return await db.transaction(async (tx) => {
      const [approvalRecord] = await tx
        .insert(actionApprovals)
        .values({
          actionId,
          approverId: userId,
          status: dto.status,
          notes: dto.notes || null,
        })
        .returning();

      // If approved, optionally track status change or store the approver ID
      if (dto.status === 'approved') {
        await tx
          .update(actions)
          .set({
            approverId: userId,
            status: 'validated',
            updatedAt: new Date(),
          })
          .where(eq(actions.id, actionId));
      }

      return approvalRecord;
    });
  }

  async addVerification(workspaceId: string, userId: string, actionId: string, dto: CreateActionVerificationDto) {
    const actionCheck = await db
      .select({ id: actions.id })
      .from(actions)
      .innerJoin(projects, eq(actions.projectId, projects.id))
      .where(and(eq(actions.id, actionId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (actionCheck.length === 0) {
      throw new NotFoundException('Action not found in this workspace');
    }

    return await db.transaction(async (tx) => {
      const [verRecord] = await tx
        .insert(verificationRecords)
        .values({
          actionId,
          verifierId: userId,
          result: dto.result,
          criteriaSnapshot: dto.criteriaSnapshot,
          evidence: dto.evidence,
        })
        .returning();

      // Update action status: if QA passed -> done, else ready_for_qa or proposed
      await tx
        .update(actions)
        .set({
          status: dto.result === 'passed' ? 'done' : 'ready_for_qa',
          updatedAt: new Date(),
        })
        .where(eq(actions.id, actionId));

      return verRecord;
    });
  }
}

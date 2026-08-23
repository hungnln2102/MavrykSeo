import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ActionsService } from './actions.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { ProjectGuard } from '../tenancy/project.guard';
import { CurrentUser, CurrentWorkspace, CurrentRole } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { UserRole } from '@seo/core';
import { AuditLog } from '../tenancy/audit-log.decorator';
import { CreateActionDto, UpdateActionStatusDto, CreateActionCommentDto, CreateActionApprovalDto, CreateActionVerificationDto } from './dto/actions.dto';

@Controller('actions')
@UseGuards(AuthGuard, TenantGuard, ProjectGuard)
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Post()
  @AuditLog('action.create', 'action')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async createAction(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser() user: any,
    @Body() body: CreateActionDto
  ) {
    return this.actionsService.createAction(workspaceId, user.id, body);
  }

  @Get()
  async getActions(
    @CurrentWorkspace() workspaceId: string,
    @Query('projectId') projectId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }
    return this.actionsService.getActions(workspaceId, projectId, status, priority);
  }

  @Get(':id')
  async getActionDetails(
    @CurrentWorkspace() workspaceId: string,
    @CurrentRole() role: UserRole,
    @Param('id') actionId: string
  ) {
    return this.actionsService.getActionDetails(workspaceId, actionId, role);
  }

  @Patch(':id/status')
  @AuditLog('action.status.update', 'action')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo', 'content')
  async updateStatus(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') actionId: string,
    @Body() body: UpdateActionStatusDto
  ) {
    return this.actionsService.updateActionStatus(workspaceId, actionId, body.status);
  }

  @Post(':id/comments')
  @AuditLog('action.comment.create', 'action')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo', 'content')
  async addComment(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser() user: any,
    @Param('id') actionId: string,
    @Body() body: CreateActionCommentDto
  ) {
    return this.actionsService.addComment(workspaceId, user.id, actionId, body);
  }

  @Post(':id/approvals')
  @AuditLog('action.approval.create', 'action')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'client') // clients or admins can approve
  async addApproval(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser() user: any,
    @Param('id') actionId: string,
    @Body() body: CreateActionApprovalDto
  ) {
    return this.actionsService.addApproval(workspaceId, user.id, actionId, body);
  }

  @Post(':id/verifications')
  @AuditLog('action.verification.create', 'action')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo') // SEO specialists/admins do QA verifications
  async addVerification(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser() user: any,
    @Param('id') actionId: string,
    @Body() body: CreateActionVerificationDto
  ) {
    return this.actionsService.addVerification(workspaceId, user.id, actionId, body);
  }
}

import { Controller, Get, Patch, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { CurrentWorkspace, CurrentRole } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { UserRole } from '@seo/core';
import { AuditLog } from '../tenancy/audit-log.decorator';

@Controller('recommendations')
@UseGuards(AuthGuard, TenantGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  async getRecommendations(
    @CurrentWorkspace() workspaceId: string,
    @CurrentRole() role: UserRole,
    @Query('projectId') projectId: string
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }
    return this.recommendationsService.getRecommendations(workspaceId, projectId, role);
  }

  @Patch(':id/status')
  @AuditLog('recommendation.status.update', 'recommendation')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo', 'content')
  async updateStatus(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') recommendationId: string,
    @Body() body: { status: string }
  ) {
    if (!body.status) {
      throw new BadRequestException('status in body is required');
    }
    return this.recommendationsService.updateRecommendationStatus(workspaceId, recommendationId, body.status);
  }

  @Patch(':id/assignee')
  @AuditLog('recommendation.assignee.update', 'recommendation')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async updateAssignee(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') recommendationId: string,
    @Body() body: { assigneeId: string | null }
  ) {
    return this.recommendationsService.updateRecommendationAssignee(workspaceId, recommendationId, body.assigneeId);
  }

  @Patch(':id/notes')
  @AuditLog('recommendation.notes.update', 'recommendation')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo', 'content')
  async updateNotes(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') recommendationId: string,
    @Body() body: { internalNotes?: string | null; clientNotes?: string | null }
  ) {
    return this.recommendationsService.updateRecommendationNotes(
      workspaceId,
      recommendationId,
      body.internalNotes,
      body.clientNotes
    );
  }
}

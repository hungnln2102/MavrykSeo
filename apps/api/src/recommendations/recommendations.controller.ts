import { Controller, Get, Patch, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { ProjectGuard } from '../tenancy/project.guard';
import { CurrentWorkspace, CurrentRole } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { UserRole } from '@seo/core';
import { AuditLog } from '../tenancy/audit-log.decorator';
import { UpdateRecommendationStatusDto, UpdateRecommendationAssigneeDto, UpdateRecommendationNotesDto } from './dto/recommendations.dto';

@Controller('recommendations')
@UseGuards(AuthGuard, TenantGuard, ProjectGuard)
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
    @Body() body: UpdateRecommendationStatusDto
  ) {
    return this.recommendationsService.updateRecommendationStatus(workspaceId, recommendationId, body.status);
  }

  @Patch(':id/assignee')
  @AuditLog('recommendation.assignee.update', 'recommendation')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async updateAssignee(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') recommendationId: string,
    @Body() body: UpdateRecommendationAssigneeDto
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
    @Body() body: UpdateRecommendationNotesDto
  ) {
    return this.recommendationsService.updateRecommendationNotes(
      workspaceId,
      recommendationId,
      body.internalNotes,
      body.clientNotes
    );
  }
}

import { Controller, Get, Patch, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { CurrentWorkspace, CurrentRole } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { UserRole } from '@seo/core';

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
}

import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { ProjectGuard } from '../tenancy/project.guard';
import { CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { AuditLog } from '../tenancy/audit-log.decorator';
import { CreateTopicDto, CreateContentPlanDto, UpdateContentPlanDto, ImportUrlDto, OptimizeContentDto } from './dto/content.dto';

@Controller('projects/:projectId')
@UseGuards(AuthGuard, TenantGuard, ProjectGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // --- Topics ---

  @Get('topics')
  async getTopics(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.contentService.getTopics(workspaceId, projectId);
  }

  @Post('topics')
  @AuditLog('content.topic.create', 'topic')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async createTopic(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: CreateTopicDto,
  ) {
    return this.contentService.createTopic(
      workspaceId,
      projectId,
      body.name,
      body.parentId,
      body.keywords,
    );
  }

  // --- Content Plans ---

  @Get('content-plans')
  async getContentPlans(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.contentService.getContentPlans(workspaceId, projectId);
  }

  @Post('content-plans')
  @AuditLog('content.plan.create', 'content_plan')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async createContentPlan(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: CreateContentPlanDto,
  ) {
    return this.contentService.createContentPlan(workspaceId, projectId, body);
  }

  @Patch('content-plans/:id')
  @AuditLog('content.plan.update', 'content_plan')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async updateContentPlan(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: UpdateContentPlanDto,
  ) {
    return this.contentService.updateContentPlan(workspaceId, projectId, id, body);
  }

  @Post('content-plans/import-url')
  @AuditLog('content.plan.import_url', 'content_plan')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async importUrl(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: ImportUrlDto,
  ) {
    return this.contentService.importUrl(
      workspaceId,
      projectId,
      body.url,
      body.primaryKeyword,
      body.topicId,
    );
  }

  @Get('content-plans/decayed')
  async getDecayedContentPlans(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.contentService.getDecayedContentPlans(workspaceId, projectId);
  }

  @Get('content-plans/:id/performance')
  async getContentPlanPerformance(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.contentService.getContentPlanPerformance(workspaceId, projectId, id);
  }

  @Post('content-plans/:id/refresh')
  @AuditLog('content.plan.refresh', 'content_plan')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async refreshContentPlan(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.contentService.refreshContentPlan(workspaceId, projectId, id);
  }

  // --- AI Briefs ---

  @Post('content-plans/:id/brief')
  @AuditLog('content.brief.generate', 'content_plan')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async generateBrief(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.contentService.generateBrief(workspaceId, projectId, id);
  }

  @Get('content-plans/:id/brief')
  async getBrief(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.contentService.getBrief(workspaceId, projectId, id);
  }

  @Post('content-plans/:id/optimize')
  @AuditLog('content.plan.optimize', 'content_plan')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async optimizeContent(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: OptimizeContentDto,
  ) {
    return this.contentService.optimizeContent(workspaceId, projectId, id, body.bodyText);
  }
}

import { Controller, Post, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';

@Controller('projects/:projectId')
@UseGuards(AuthGuard, TenantGuard)
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
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async createTopic(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: { name: string; parentId?: string; keywords?: string[] },
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
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async createContentPlan(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: {
      topicId?: string;
      title: string;
      primaryKeyword: string;
      secondaryKeywords?: string[];
      status?: string;
      dueDate?: string;
      assigneeId?: string;
    },
  ) {
    return this.contentService.createContentPlan(workspaceId, projectId, body);
  }

  @Patch('content-plans/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async updateContentPlan(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: {
      topicId?: string | null;
      title?: string;
      primaryKeyword?: string;
      secondaryKeywords?: string[];
      status?: string;
      dueDate?: string | null;
      body?: string;
      assigneeId?: string | null;
    },
  ) {
    return this.contentService.updateContentPlan(workspaceId, projectId, id, body);
  }

  // --- AI Briefs ---

  @Post('content-plans/:id/brief')
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
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async optimizeContent(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: { bodyText: string },
  ) {
    return this.contentService.optimizeContent(workspaceId, projectId, id, body.bodyText);
  }
}

import { Controller, Post, Get, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { SitesService } from './sites.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { ProjectGuard } from '../tenancy/project.guard';
import { CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { AuditLog } from '../tenancy/audit-log.decorator';

@Controller('sites')
@UseGuards(AuthGuard, TenantGuard, ProjectGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @AuditLog('site.create', 'site')
  async createSite(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { projectId: string; domain: string }
  ) {
    if (!body.projectId || !body.domain) {
      throw new BadRequestException('projectId and domain are required');
    }
    return this.sitesService.createSite(workspaceId, body.projectId, body.domain);
  }

  @Get()
  async getSites(
    @CurrentWorkspace() workspaceId: string,
    @Query('projectId') projectId: string
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }
    return this.sitesService.getSites(workspaceId, projectId);
  }

  @Post(':siteId/crawl')
  @AuditLog('site.crawl.request', 'site')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async triggerCrawl(
    @CurrentWorkspace() workspaceId: string,
    @Param('siteId') siteId: string,
  ) {
    return this.sitesService.triggerCrawl(workspaceId, siteId);
  }

  @Post(':siteId/crawl-schedule')
  @AuditLog('site.crawl.schedule.update', 'site')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async updateCrawlSchedule(
    @CurrentWorkspace() workspaceId: string,
    @Param('siteId') siteId: string,
    @Body() body: { crawlScheduleMinutes?: number | null },
  ) {
    if (body.crawlScheduleMinutes !== null && body.crawlScheduleMinutes !== undefined
      && (!Number.isInteger(body.crawlScheduleMinutes) || body.crawlScheduleMinutes < 60)) {
      throw new BadRequestException('crawlScheduleMinutes must be null or an integer of at least 60 minutes');
    }
    return this.sitesService.updateCrawlSchedule(workspaceId, siteId, body.crawlScheduleMinutes ?? null);
  }

  @Get(':siteId/crawls')
  @AuditLog('site.crawls.read', 'site')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async getSiteCrawls(
    @CurrentWorkspace() workspaceId: string,
    @Param('siteId') siteId: string,
  ) {
    return this.sitesService.getSiteCrawls(workspaceId, siteId);
  }

  @Get(':siteId/crawls/:jobRunId/raw')
  @AuditLog('site.crawl_raw.read', 'site')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async getCrawlRawHtml(
    @CurrentWorkspace() workspaceId: string,
    @Param('siteId') siteId: string,
    @Param('jobRunId') jobRunId: string,
  ) {
    return this.sitesService.getCrawlRawHtml(workspaceId, siteId, jobRunId);
  }
}

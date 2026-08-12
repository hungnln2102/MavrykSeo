import { Controller, Post, Get, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { SitesService } from './sites.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';

@Controller('sites')
@UseGuards(AuthGuard, TenantGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
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
}

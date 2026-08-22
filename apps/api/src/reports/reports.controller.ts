import { Controller, Post, Get, Body, UseGuards, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { ProjectGuard } from '../tenancy/project.guard';
import { CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { AuditLog } from '../tenancy/audit-log.decorator';

@Controller('projects/:projectId/reports')
@UseGuards(AuthGuard, TenantGuard, ProjectGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async getReports(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string
  ) {
    return this.reportsService.getReports(workspaceId, projectId);
  }

  @Post()
  @AuditLog('report.create', 'report')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async createReport(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: { title: string; type: string }
  ) {
    return this.reportsService.createReport(workspaceId, projectId, body.title, body.type);
  }
}

import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { AuditsService } from './audits.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { ProjectGuard } from '../tenancy/project.guard';
import { CurrentUser, CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { AuditLog } from '../tenancy/audit-log.decorator';
import { CreateAuditRunDto, VerifyControlResultDto } from './dto/audits.dto';

@Controller()
@UseGuards(AuthGuard, TenantGuard, ProjectGuard)
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Post('projects/:projectId/audit-runs')
  @AuditLog('audit_run.create', 'audit_run')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async createAuditRun(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: CreateAuditRunDto
  ) {
    return this.auditsService.createAuditRun(workspaceId, projectId, body.standardVersionId, body.scopeSnapshot);
  }

  @Get('projects/:projectId/audit-runs')
  async getAuditRuns(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string
  ) {
    return this.auditsService.getAuditRuns(workspaceId, projectId);
  }

  @Get('audit-runs/:id/results')
  async getAuditRunResults(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') id: string
  ) {
    return this.auditsService.getAuditRunResults(workspaceId, id);
  }

  @Post('control-results/:id/manual-verification')
  @AuditLog('control_result.verify', 'audit_control_results')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async verifyControlResult(
    @CurrentWorkspace() workspaceId: string,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: VerifyControlResultDto
  ) {
    return this.auditsService.updateControlResult(
      workspaceId,
      id,
      body.result,
      body.exceptionReason,
      user.id
    );
  }
}

import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuditLog } from '../tenancy/audit-log.decorator';
import { CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles('owner', 'admin')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('failed')
  @AuditLog('job.failed.read', 'job_run')
  async getFailedJobs(@CurrentWorkspace() workspaceId: string) {
    return this.jobsService.getFailedJobs(workspaceId);
  }

  @Post(':jobRunId/replay')
  @AuditLog('job.replay', 'job_run')
  async replayFailedJob(
    @CurrentWorkspace() workspaceId: string,
    @Param('jobRunId') jobRunId: string,
  ) {
    return this.jobsService.replayFailedJob(workspaceId, jobRunId);
  }

  @Post(':jobRunId/reprocess')
  @AuditLog('job.reprocess', 'job_run')
  async reprocessJob(
    @CurrentWorkspace() workspaceId: string,
    @Param('jobRunId') jobRunId: string,
  ) {
    return this.jobsService.reprocessJob(workspaceId, jobRunId);
  }
}

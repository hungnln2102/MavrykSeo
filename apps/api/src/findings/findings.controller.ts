import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { FindingsService } from './findings.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { ProjectGuard } from '../tenancy/project.guard';
import { CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { AuditLog } from '../tenancy/audit-log.decorator';
import { CreateFindingDto, UpdateFindingStatusDto, CreateObservationDto } from './dto/findings.dto';

@Controller('findings')
@UseGuards(AuthGuard, TenantGuard, ProjectGuard)
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Post()
  @AuditLog('finding.create', 'finding')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async createFinding(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: CreateFindingDto
  ) {
    return this.findingsService.createFinding(workspaceId, body);
  }

  @Get()
  async getFindings(
    @CurrentWorkspace() workspaceId: string,
    @Query('projectId') projectId: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }
    return this.findingsService.getFindings(workspaceId, projectId, status, severity);
  }

  @Patch(':id/status')
  @AuditLog('finding.status.update', 'finding')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async updateStatus(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') findingId: string,
    @Body() body: UpdateFindingStatusDto
  ) {
    return this.findingsService.updateFindingStatus(workspaceId, findingId, body.status);
  }

  @Get(':id/affected-entities')
  async getAffectedEntities(
    @CurrentWorkspace() workspaceId: string,
    @Param('id') findingId: string
  ) {
    return this.findingsService.getAffectedEntities(workspaceId, findingId);
  }

  @Post('observations')
  @AuditLog('observation.create', 'observation')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async createObservation(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: CreateObservationDto
  ) {
    return this.findingsService.createObservation(workspaceId, body);
  }

  @Get('observations')
  async getObservations(
    @CurrentWorkspace() workspaceId: string,
    @Query('projectId') projectId: string
  ) {
    if (!projectId) {
      throw new BadRequestException('projectId query parameter is required');
    }
    return this.findingsService.getObservations(workspaceId, projectId);
  }
}

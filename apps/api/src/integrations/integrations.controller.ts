import { Controller, Post, Get, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { ProjectGuard } from '../tenancy/project.guard';
import { CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { AuditLog } from '../tenancy/audit-log.decorator';
import { SaveIntegrationDto } from './dto/integrations.dto';

@Controller('projects/:projectId/integrations')
@UseGuards(AuthGuard, TenantGuard, ProjectGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post(':provider')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @AuditLog('integration.save', 'integration')
  async saveIntegration(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('provider') provider: string,
    @Body() body: SaveIntegrationDto
  ) {
    return this.integrationsService.saveIntegration(workspaceId, projectId, provider, body.credentials);
  }

  @Get(':provider')
  @AuditLog('integration.status.read', 'integration')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  async getIntegration(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('provider') provider: string
  ) {
    return this.integrationsService.getIntegration(workspaceId, projectId, provider);
  }
}

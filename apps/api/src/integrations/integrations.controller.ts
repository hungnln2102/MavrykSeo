import { Controller, Post, Get, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { AuditLog } from '../tenancy/audit-log.decorator';

@Controller('projects/:projectId/integrations')
@UseGuards(AuthGuard, TenantGuard)
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
    @Body() body: { credentials: any }
  ) {
    if (!body.credentials) {
      throw new BadRequestException('credentials body is required');
    }
    return this.integrationsService.saveIntegration(workspaceId, projectId, provider, body.credentials);
  }

  @Get(':provider')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async getIntegration(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('provider') provider: string
  ) {
    return this.integrationsService.getIntegration(workspaceId, projectId, provider);
  }
}

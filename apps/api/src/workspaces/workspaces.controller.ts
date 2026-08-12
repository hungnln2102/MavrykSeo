import { Controller, Post, Get, Body, UseGuards, Patch, Param } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { CurrentUser, CurrentWorkspace } from '../tenancy/decorators';
import { UserRole } from '@seo/core';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';

@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  async createWorkspace(
    @CurrentUser() user: { id: string },
    @Body() body: { name: string; slug: string }
  ) {
    return this.workspacesService.createWorkspace(user.id, body.name, body.slug);
  }

  @Get()
  async getWorkspaces(@CurrentUser() user: { id: string }) {
    return this.workspacesService.getWorkspacesForUser(user.id);
  }

  @Get('active/members')
  @UseGuards(TenantGuard)
  async getMembers(@CurrentWorkspace() workspaceId: string) {
    return this.workspacesService.getWorkspaceMembers(workspaceId);
  }

  @Post('active/members')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  async addMember(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { email: string; role: UserRole }
  ) {
    return this.workspacesService.addWorkspaceMember(workspaceId, body.email, body.role);
  }

  @Patch(':id/status')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    return this.workspacesService.updateWorkspaceStatus(id, body.status);
  }

  @Patch(':id/plan')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  async updatePlan(
    @Param('id') id: string,
    @Body() body: { plan: string }
  ) {
    return this.workspacesService.updateWorkspacePlan(id, body.plan);
  }

  @Patch('active/white-label')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  async updateWhiteLabel(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { logo: string; colors: { primary: string; secondary: string } }
  ) {
    return this.workspacesService.updateWorkspaceWhiteLabel(workspaceId, body.logo, body.colors);
  }

  @Get('active/white-label')
  @UseGuards(TenantGuard)
  async getWhiteLabel(@CurrentWorkspace() workspaceId: string) {
    return this.workspacesService.getWorkspaceWhiteLabel(workspaceId);
  }
}

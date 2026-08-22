import { Controller, Post, Get, Body, UseGuards, Patch } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { CurrentUser, CurrentWorkspace } from '../tenancy/decorators';
import { UserRole } from '@seo/core';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { AuditLog } from '../tenancy/audit-log.decorator';

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
  @AuditLog('workspace.members.read', 'workspace')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  async getMembers(@CurrentWorkspace() workspaceId: string) {
    return this.workspacesService.getWorkspaceMembers(workspaceId);
  }

  @Post('active/members')
  @AuditLog('workspace.member.add', 'membership')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  async addMember(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { email: string; role: UserRole }
  ) {
    return this.workspacesService.addWorkspaceMember(workspaceId, body.email, body.role);
  }

  @Patch('active/status')
  @AuditLog('workspace.status.update', 'workspace')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  async updateStatus(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { status: string }
  ) {
    return this.workspacesService.updateWorkspaceStatus(workspaceId, body.status);
  }

  @Patch('active/plan')
  @AuditLog('workspace.plan.update', 'workspace')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  async updatePlan(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { plan: string }
  ) {
    return this.workspacesService.updateWorkspacePlan(workspaceId, body.plan);
  }

  @Patch('active/white-label')
  @AuditLog('workspace.white_label.update', 'workspace')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  async updateWhiteLabel(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { logo: string; colors: { primary: string; secondary: string } }
  ) {
    return this.workspacesService.updateWorkspaceWhiteLabel(workspaceId, body.logo, body.colors);
  }

  @Get('active/white-label')
  @AuditLog('workspace.white_label.read', 'workspace')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin')
  async getWhiteLabel(@CurrentWorkspace() workspaceId: string) {
    return this.workspacesService.getWorkspaceWhiteLabel(workspaceId);
  }

  @Get('active/audit-logs')
  @AuditLog('workspace.audit_logs.read', 'workspace')
  @UseGuards(TenantGuard, RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async getAuditLogs(@CurrentWorkspace() workspaceId: string) {
    return this.workspacesService.getAuditLogs(workspaceId);
  }
}

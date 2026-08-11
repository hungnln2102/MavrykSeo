import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { CurrentUser, CurrentWorkspace } from '../tenancy/decorators';
import { UserRole } from '@seo/core';

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
  @UseGuards(TenantGuard)
  async addMember(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { email: string; role: UserRole }
  ) {
    return this.workspacesService.addWorkspaceMember(workspaceId, body.email, body.role);
  }
}

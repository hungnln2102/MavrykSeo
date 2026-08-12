import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';

@Controller('projects')
@UseGuards(AuthGuard, TenantGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager')
  async createProject(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: { name: string }
  ) {
    return this.projectsService.createProject(workspaceId, body.name);
  }

  @Get()
  async getProjects(@CurrentWorkspace() workspaceId: string) {
    return this.projectsService.getProjects(workspaceId);
  }
}

import { Controller, Post, Get, Body, UseGuards, Param } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { ProjectGuard } from '../tenancy/project.guard';
import { CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { CreateProjectDto } from './dto/projects.dto';

@Controller('projects')
@UseGuards(AuthGuard, TenantGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager')
  async createProject(
    @CurrentWorkspace() workspaceId: string,
    @Body() body: CreateProjectDto
  ) {
    return this.projectsService.createProject(workspaceId, body.name);
  }

  @Get()
  async getProjects(@CurrentWorkspace() workspaceId: string) {
    return this.projectsService.getProjects(workspaceId);
  }

  @Get(':projectId/gsc-performance')
  @UseGuards(ProjectGuard)
  async getProjectGscPerformance(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string
  ) {
    return this.projectsService.getProjectGscPerformance(workspaceId, projectId);
  }

  @Post(':projectId/gsc-sync')
  @UseGuards(ProjectGuard, RolesGuard)
  @Roles('owner', 'admin')
  async inlineSyncGsc(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string
  ) {
    return this.projectsService.inlineSyncGsc(workspaceId, projectId);
  }
}


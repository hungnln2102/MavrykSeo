import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { AuthGuard } from '../auth/auth.guard';
import { TenantGuard } from '../tenancy/tenant.guard';
import { ProjectGuard } from '../tenancy/project.guard';
import { CurrentWorkspace } from '../tenancy/decorators';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';
import { AddKeywordDto, ResearchKeywordDto, ClusterKeywordsDto } from './dto/keywords.dto';

@Controller('projects/:projectId')
@UseGuards(AuthGuard, TenantGuard, ProjectGuard)
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Post('keywords')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async addKeyword(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: AddKeywordDto,
  ) {
    return this.keywordsService.addKeyword(workspaceId, projectId, body.keyword, body.targetUrl);
  }

  @Get('keywords')
  async getKeywords(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.keywordsService.getKeywords(workspaceId, projectId);
  }

  @Delete('keywords/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async deleteKeyword(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.keywordsService.deleteKeyword(workspaceId, projectId, id);
  }

  @Post('keywords/research')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async researchKeyword(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: ResearchKeywordDto,
  ) {
    return this.keywordsService.researchKeyword(workspaceId, projectId, body.keyword);
  }

  @Post('keywords/cluster')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin', 'manager', 'seo')
  async clusterKeywords(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() body: ClusterKeywordsDto,
  ) {
    return this.keywordsService.clusterKeywords(workspaceId, projectId, body.keywords);
  }

  @Get('competitors/gap')
  async getCompetitorGap(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
    @Query('competitors') competitors?: string,
  ) {
    return this.keywordsService.getCompetitorGap(workspaceId, projectId, competitors);
  }

  @Get('competitors/rankings')
  async getCompetitorRankings(
    @CurrentWorkspace() workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.keywordsService.getCompetitorRankings(workspaceId, projectId);
  }
}

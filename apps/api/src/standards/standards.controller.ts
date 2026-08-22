import { Controller, Get, Param, Delete, UseGuards } from '@nestjs/common';
import { StandardsService } from './standards.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../tenancy/roles.decorator';
import { RolesGuard } from '../tenancy/roles.guard';

@Controller('standards')
@UseGuards(AuthGuard)
export class StandardsController {
  constructor(private readonly standardsService: StandardsService) {}

  @Get('versions')
  async getVersions() {
    return this.standardsService.getVersions();
  }

  @Get('versions/:id/controls')
  async getVersionControls(@Param('id') id: string) {
    return this.standardsService.getVersionControls(id);
  }

  @Delete('versions/:id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  async deleteVersion(@Param('id') id: string) {
    return this.standardsService.deleteVersion(id);
  }
}

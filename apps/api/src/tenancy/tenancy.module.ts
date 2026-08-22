import { Module, Global } from '@nestjs/common';
import { ScopingHelper } from './scoping.helper';
import { TenantGuard } from './tenant.guard';
import { RolesGuard } from './roles.guard';
import { ProjectGuard } from './project.guard';

@Global()
@Module({
  providers: [
    ScopingHelper,
    TenantGuard,
    RolesGuard,
    ProjectGuard,
  ],
  exports: [
    ScopingHelper,
    TenantGuard,
    RolesGuard,
    ProjectGuard,
  ],
})
export class TenancyModule {}

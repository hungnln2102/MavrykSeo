import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { SitesModule } from './sites/sites.module';

@Module({
  imports: [AuthModule, WorkspacesModule, ProjectsModule, SitesModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

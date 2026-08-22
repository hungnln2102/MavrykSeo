import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { GscOAuthCallbackController, GscOAuthController } from './gsc-oauth.controller';
import { GscOAuthService } from './gsc-oauth.service';
import { GscSyncService } from './gsc-sync.service';

@Module({
  controllers: [IntegrationsController, GscOAuthController, GscOAuthCallbackController],
  providers: [IntegrationsService, GscOAuthService, GscSyncService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}

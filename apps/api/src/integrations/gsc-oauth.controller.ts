import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { AuditLog } from "../tenancy/audit-log.decorator";
import { CurrentWorkspace } from "../tenancy/decorators";
import { Roles } from "../tenancy/roles.decorator";
import { RolesGuard } from "../tenancy/roles.guard";
import { TenantGuard } from "../tenancy/tenant.guard";
import { IntegrationsService } from "./integrations.service";
import { GscOAuthService } from "./gsc-oauth.service";
import { GscSyncService } from "./gsc-sync.service";

@Controller("projects/:projectId/integrations/google-search-console")
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles("owner", "admin")
export class GscOAuthController {
  constructor(
    private readonly gscOAuthService: GscOAuthService,
    private readonly integrationsService: IntegrationsService,
    private readonly gscSyncService: GscSyncService,
  ) {}

  @Get("authorize")
  @AuditLog("gsc.oauth.authorize", "integration")
  async authorize(
    @CurrentWorkspace() workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return {
      authorizationUrl: await this.gscOAuthService.createAuthorizationUrl(
        workspaceId,
        projectId,
      ),
    };
  }

  @Post("reconnect")
  @AuditLog("gsc.oauth.reconnect", "integration")
  async reconnect(
    @CurrentWorkspace() workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return {
      authorizationUrl: await this.gscOAuthService.createAuthorizationUrl(
        workspaceId,
        projectId,
      ),
    };
  }

  @Post("revoke")
  @AuditLog("gsc.oauth.revoke", "integration")
  async revoke(
    @CurrentWorkspace() workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    const credentials =
      await this.integrationsService.getIntegrationCredentials(
        workspaceId,
        projectId,
        "google_search_console",
      );
    await this.gscOAuthService.revokeAccess(credentials);
    return {
      integration: await this.integrationsService.markIntegrationStatus(
        workspaceId,
        projectId,
        "google_search_console",
        "revoked",
      ),
    };
  }

  @Get("properties")
  @AuditLog("gsc.property.list", "integration")
  async listProperties(
    @CurrentWorkspace() workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    const credentials =
      await this.integrationsService.getIntegrationCredentials(
        workspaceId,
        projectId,
        "google_search_console",
      );
    return {
      properties: await this.gscOAuthService.listProperties(credentials),
    };
  }

  @Put("property")
  @AuditLog("gsc.property.select", "integration")
  async selectProperty(
    @CurrentWorkspace() workspaceId: string,
    @Param("projectId") projectId: string,
    @Body() body: { siteUrl?: string },
  ) {
    const credentials =
      await this.integrationsService.getIntegrationCredentials(
        workspaceId,
        projectId,
        "google_search_console",
      );
    const updatedCredentials = await this.gscOAuthService.selectProperty(
      credentials,
      body.siteUrl || "",
    );
    const integration = await this.integrationsService.saveIntegration(
      workspaceId,
      projectId,
      "google_search_console",
      updatedCredentials,
    );

    return { integration, selectedProperty: updatedCredentials.siteUrl };
  }

  @Post("sync")
  @AuditLog("gsc.sync.request", "integration")
  requestSync(
    @CurrentWorkspace() workspaceId: string,
    @Param("projectId") projectId: string,
    @Body() body: { startDate?: string; endDate?: string },
  ) {
    return this.gscSyncService.requestSync(workspaceId, projectId, body || {});
  }

  @Get("sync-status")
  @AuditLog("gsc.sync.status.read", "integration")
  getSyncStatus(
    @CurrentWorkspace() workspaceId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.gscSyncService.getStatus(workspaceId, projectId);
  }
}

@Controller("integrations/google-search-console")
export class GscOAuthCallbackController {
  constructor(
    private readonly gscOAuthService: GscOAuthService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Get("callback")
  async callback(
    @Query("code") code?: string,
    @Query("state") state?: string,
    @Query("error") error?: string,
  ) {
    if (error) {
      throw new BadRequestException(
        "Google authorization was denied or cancelled",
      );
    }

    const result = await this.gscOAuthService.exchangeAuthorizationCode(
      code || "",
      state || "",
    );
    const integration = await this.integrationsService.saveIntegration(
      result.workspaceId,
      result.projectId,
      "google_search_console",
      result.credentials,
    );

    return { connected: true, integration };
  }
}

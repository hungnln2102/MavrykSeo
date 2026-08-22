import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { decryptToken, encryptToken } from "@seo/core";
import { db, gscOauthStates, projects } from "@seo/db";
import { and, eq, gt, isNull } from "drizzle-orm";

const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GSC_READONLY_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

interface GoogleSiteListResponse {
  siteEntry?: Array<{
    permissionLevel?: string;
    siteUrl?: string;
  }>;
}

export interface GscCredentials {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
  scope: string;
  siteUrl?: string;
  tokenType: string;
}

export interface GscProperty {
  permissionLevel: string;
  siteUrl: string;
}

@Injectable()
export class GscOAuthService {
  async createAuthorizationUrl(
    workspaceId: string,
    projectId: string,
  ): Promise<string> {
    const config = this.getConfig();
    await this.assertProjectBelongsToWorkspace(workspaceId, projectId);

    const codeVerifier = this.createCodeVerifier();
    const state = randomBytes(32).toString("base64url");

    await db.insert(gscOauthStates).values({
      workspaceId,
      projectId,
      stateHash: this.hashState(state),
      encryptedCodeVerifier: encryptToken(codeVerifier),
      expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
    });

    const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GSC_READONLY_SCOPE);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set(
      "code_challenge",
      this.createCodeChallenge(codeVerifier),
    );
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", state);

    return url.toString();
  }

  async exchangeAuthorizationCode(code: string, stateValue: string) {
    if (!code) {
      throw new BadRequestException("Google authorization code is required");
    }

    const config = this.getConfig();
    const [state] = await db
      .update(gscOauthStates)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(gscOauthStates.stateHash, this.hashState(stateValue)),
          isNull(gscOauthStates.consumedAt),
          gt(gscOauthStates.expiresAt, new Date()),
        ),
      )
      .returning({
        workspaceId: gscOauthStates.workspaceId,
        projectId: gscOauthStates.projectId,
        encryptedCodeVerifier: gscOauthStates.encryptedCodeVerifier,
      });

    if (!state) {
      throw new BadRequestException("OAuth state is invalid or expired");
    }

    let codeVerifier: string;
    try {
      codeVerifier = decryptToken(state.encryptedCodeVerifier);
    } catch {
      throw new BadRequestException("OAuth state is invalid or expired");
    }

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
    });
    const token = (await response
      .json()
      .catch(() => ({}))) as GoogleTokenResponse;

    if (!response.ok || !token.access_token || !token.refresh_token) {
      throw new BadRequestException(
        "Google authorization could not be completed",
      );
    }

    return {
      workspaceId: state.workspaceId,
      projectId: state.projectId,
      credentials: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: Date.now() + (token.expires_in || 0) * 1000,
        scope: token.scope || GSC_READONLY_SCOPE,
        tokenType: token.token_type || "Bearer",
      },
    };
  }

  async listProperties(credentials: unknown): Promise<GscProperty[]> {
    const accessToken = this.getAccessToken(credentials);
    const response = await fetch(
      "https://www.googleapis.com/webmasters/v3/sites",
      {
        headers: { authorization: `Bearer ${accessToken}` },
      },
    );
    const payload = (await response
      .json()
      .catch(() => ({}))) as GoogleSiteListResponse;

    if (!response.ok) {
      throw new ServiceUnavailableException(
        "Google Search Console properties could not be retrieved",
      );
    }

    const properties: GscProperty[] = [];
    for (const entry of payload.siteEntry || []) {
      if (typeof entry.siteUrl !== "string") {
        continue;
      }

      properties.push({
        siteUrl: entry.siteUrl,
        permissionLevel: entry.permissionLevel || "siteUnverifiedUser",
      });
    }
    return properties;
  }

  async revokeAccess(credentials: unknown): Promise<void> {
    const accessToken = this.getAccessToken(credentials);
    const response = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: accessToken }),
    });
    if (!response.ok && response.status !== 400) {
      throw new ServiceUnavailableException(
        "Google Search Console access could not be revoked",
      );
    }
  }

  async selectProperty(
    credentials: unknown,
    siteUrl: string,
  ): Promise<GscCredentials> {
    if (
      typeof siteUrl !== "string" ||
      !siteUrl.trim() ||
      siteUrl.length > 2048
    ) {
      throw new BadRequestException(
        "Google Search Console property is required",
      );
    }

    const normalizedSiteUrl = siteUrl.trim();
    const properties = await this.listProperties(credentials);
    if (
      !properties.some((property) => property.siteUrl === normalizedSiteUrl)
    ) {
      throw new BadRequestException(
        "Google Search Console property is not authorized for this account",
      );
    }

    return { ...this.getCredentials(credentials), siteUrl: normalizedSiteUrl };
  }

  private getConfig() {
    const clientId = process.env.GSC_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GSC_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new ServiceUnavailableException(
        "Google Search Console OAuth is not configured",
      );
    }

    return { clientId, clientSecret, redirectUri };
  }

  private async assertProjectBelongsToWorkspace(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    const result = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)),
      )
      .limit(1);

    if (result.length === 0) {
      throw new BadRequestException("Project not found in this workspace");
    }
  }

  private getAccessToken(credentials: unknown): string {
    return this.getCredentials(credentials).accessToken;
  }

  private getCredentials(credentials: unknown): GscCredentials {
    if (!credentials || typeof credentials !== "object") {
      throw new BadRequestException(
        "Google Search Console credentials are invalid",
      );
    }

    const value = credentials as Partial<GscCredentials>;
    if (
      !value.accessToken ||
      !value.refreshToken ||
      !value.tokenType ||
      !value.scope ||
      typeof value.expiresAt !== "number"
    ) {
      throw new BadRequestException(
        "Google Search Console credentials are invalid",
      );
    }

    return value as GscCredentials;
  }

  private hashState(state: string): string {
    if (!state) {
      throw new BadRequestException("OAuth state is required");
    }

    return createHash("sha256").update(state).digest("hex");
  }

  private createCodeVerifier(): string {
    return randomBytes(48).toString("base64url");
  }

  private createCodeChallenge(codeVerifier: string): string {
    return createHash("sha256").update(codeVerifier).digest("base64url");
  }
}

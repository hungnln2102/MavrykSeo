import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { decryptToken, encryptToken } from '@seo/core';
import { GscOAuthService, GSC_READONLY_SCOPE } from './gsc-oauth.service';

jest.mock('@seo/db', () => {
  const database = {
    insert: jest.fn(),
    select: jest.fn(),
    update: jest.fn(),
  };

  return {
    db: database,
    gscOauthStates: {
      stateHash: 'state_hash',
      consumedAt: 'consumed_at',
      expiresAt: 'expires_at',
      workspaceId: 'workspace_id',
      projectId: 'project_id',
      encryptedCodeVerifier: 'encrypted_code_verifier',
    },
    projects: { id: 'id', workspaceId: 'workspace_id' },
  };
});

jest.mock('drizzle-orm', () => ({
  and: jest.fn((...conditions: unknown[]) => conditions),
  eq: jest.fn((column: unknown, value: unknown) => ({ column, value })),
  gt: jest.fn((column: unknown, value: unknown) => ({ column, value })),
  isNull: jest.fn((column: unknown) => ({ column })),
}));

const database = jest.requireMock('@seo/db').db;

describe('GscOAuthService', () => {
  const service = new GscOAuthService();

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.GSC_OAUTH_CLIENT_ID = 'gsc-client-id';
    process.env.GSC_OAUTH_CLIENT_SECRET = 'gsc-client-secret';
    process.env.GSC_OAUTH_REDIRECT_URI = 'http://localhost:3000/integrations/google-search-console/callback';
    process.env.GSC_TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    database.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([{ id: 'project-1' }]) }),
      }),
    });
    database.insert.mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) });
  });

  it('creates a read-only authorization request with S256 PKCE and an opaque persistent state', async () => {
    const authorizationUrl = new URL(await service.createAuthorizationUrl('workspace-1', 'project-1'));
    const insertedState = database.insert.mock.results[0].value.values.mock.calls[0][0];

    expect(authorizationUrl.origin).toBe('https://accounts.google.com');
    expect(authorizationUrl.searchParams.get('scope')).toBe(GSC_READONLY_SCOPE);
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorizationUrl.searchParams.get('state')).not.toContain('workspace-1');
    expect(insertedState).toMatchObject({ workspaceId: 'workspace-1', projectId: 'project-1' });
    expect(insertedState.stateHash).toHaveLength(64);
    expect(decryptToken(insertedState.encryptedCodeVerifier)).toBeTruthy();
    expect(insertedState.expiresAt).toBeInstanceOf(Date);
  });

  it('fails closed when OAuth configuration is incomplete', async () => {
    delete process.env.GSC_OAUTH_CLIENT_SECRET;

    await expect(service.createAuthorizationUrl('workspace-1', 'project-1')).rejects.toThrow(
      new ServiceUnavailableException('Google Search Console OAuth is not configured'),
    );
  });

  it('rejects a replayed or expired state before exchanging tokens', async () => {
    database.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([]) }),
      }),
    });
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    await expect(service.exchangeAuthorizationCode('authorization-code', 'replayed-state')).rejects.toThrow(
      new BadRequestException('OAuth state is invalid or expired'),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('consumes a valid state once and exchanges the code with its stored PKCE verifier', async () => {
    const codeVerifier = 'stored-code-verifier';
    database.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            workspaceId: 'workspace-1',
            projectId: 'project-1',
            encryptedCodeVerifier: encryptToken(codeVerifier),
          }]),
        }),
      }),
    });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
      }),
    });
    global.fetch = fetchMock;

    const result = await service.exchangeAuthorizationCode('authorization-code', 'valid-state');

    expect(result).toMatchObject({ workspaceId: 'workspace-1', projectId: 'project-1' });
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      body: expect.any(URLSearchParams),
    }));
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).get('code_verifier')).toBe(codeVerifier);
  });

  it('returns only safe properties from Google Search Console', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        siteEntry: [
          { siteUrl: 'https://example.com/', permissionLevel: 'siteOwner' },
          { siteUrl: 'sc-domain:example.org', permissionLevel: 'siteFullUser' },
          { permissionLevel: 'siteOwner' },
        ],
      }),
    });
    global.fetch = fetchMock;

    await expect(service.listProperties({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 3600_000,
      scope: GSC_READONLY_SCOPE,
      tokenType: 'Bearer',
    })).resolves.toEqual([
      { siteUrl: 'https://example.com/', permissionLevel: 'siteOwner' },
      { siteUrl: 'sc-domain:example.org', permissionLevel: 'siteFullUser' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), {
      headers: { authorization: 'Bearer access-token' },
    });
  });

  it('rejects a property that Google did not authorize', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        siteEntry: [{ siteUrl: 'https://example.com/', permissionLevel: 'siteOwner' }],
      }),
    });
    global.fetch = fetchMock;

    await expect(service.selectProperty({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 3600_000,
      scope: GSC_READONLY_SCOPE,
      tokenType: 'Bearer',
    }, 'https://not-authorized.example/')).rejects.toThrow(
      new BadRequestException('Google Search Console property is not authorized for this account'),
    );
  });

  it('revokes the provider access token without exposing credentials', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock;

    await expect(service.revokeAccess({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: Date.now() + 3600_000,
      scope: GSC_READONLY_SCOPE,
      tokenType: 'Bearer',
    })).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith('https://oauth2.googleapis.com/revoke', expect.objectContaining({
      method: 'POST',
      body: expect.any(URLSearchParams),
    }));
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).get('token')).toBe('access-token');
  });
});

import { HttpStatus } from '@nestjs/common';

jest.mock('@seo/db', () => ({
  db: { select: jest.fn() },
  workspaces: { plan: 'workspaces.plan', id: 'workspaces.id' },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
}));

import { RateLimitGuard } from './rate-limit.guard';

function createContext(ip: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        url: '/auth/login',
        headers: {},
        ip,
      }),
    }),
  } as never;
}

function clearRateLimitCache() {
  const guardWithCache = RateLimitGuard as unknown as {
    cache: Map<string, unknown>;
  };
  guardWithCache.cache.clear();
}

describe('RateLimitGuard', () => {
  const guard = new RateLimitGuard();

  beforeEach(() => {
    clearRateLimitCache();
  });

  it('rate limits repeated login attempts from the same IP', async () => {
    const context = createContext('198.51.100.10');

    for (let attempt = 0; attempt < 60; attempt++) {
      await expect(guard.canActivate(context)).resolves.toBe(true);
    }

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it('does not consume another client IP rate-limit budget', async () => {
    const firstClient = createContext('198.51.100.10');
    const secondClient = createContext('198.51.100.11');

    for (let attempt = 0; attempt < 60; attempt++) {
      await expect(guard.canActivate(firstClient)).resolves.toBe(true);
    }

    await expect(guard.canActivate(firstClient)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    await expect(guard.canActivate(secondClient)).resolves.toBe(true);
  });
});

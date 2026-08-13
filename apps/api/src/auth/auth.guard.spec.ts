import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

function createContext(headers: Record<string, string>) {
  const request: Record<string, unknown> = { headers };
  return {
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as never,
  };
}

describe('AuthGuard', () => {
  const jwtService = { verifyAsync: jest.fn() } as unknown as { verifyAsync: jest.Mock } & import('@nestjs/jwt').JwtService;
  const guard = new AuthGuard(jwtService);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  it('verifies a valid bearer token and injects the authenticated user', async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1', email: 'user@example.test' });
    const { context, request } = createContext({ authorization: 'Bearer valid-token' });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', { secret: 'test-jwt-secret' });
    expect(request).toMatchObject({ user: { id: 'user-1', email: 'user@example.test' } });
  });

  it.each([
    ['expired', new Error('jwt expired')],
    ['malformed', new Error('jwt malformed')],
  ])('rejects an %s token without injecting user context', async (_name, error) => {
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(error);
    const { context, request } = createContext({ authorization: 'Bearer invalid-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired authentication token'),
    );
    expect(request).not.toHaveProperty('user');
  });

  it.each(['Basic valid-token', 'Bearer', 'Token valid-token'])('rejects malformed authorization headers', async (authorization) => {
    const { context } = createContext({ authorization });

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing authentication token'),
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });
});
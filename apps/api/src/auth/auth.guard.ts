import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getJwtSecret } from '../config/runtime-secrets';
import { db, authSessions } from '@seo/db';
import { eq } from 'drizzle-orm';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<any>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: getJwtSecret(),
      });

      // Clean session revocation check
      if (payload.sessionId) {
        const [session] = await db
          .select()
          .from(authSessions)
          .where(eq(authSessions.id, payload.sessionId))
          .limit(1);

        if (!session) {
          throw new UnauthorizedException('Session not found');
        }
        if (session.revokedAt) {
          throw new UnauthorizedException('Session has been revoked');
        }
        if (session.expiresAt < new Date()) {
          throw new UnauthorizedException('Session has expired');
        }
      }

      // Attach user credentials to request context
      request['user'] = {
        id: payload.sub,
        email: payload.email,
        sessionId: payload.sessionId,
      };
    } catch (e: any) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}

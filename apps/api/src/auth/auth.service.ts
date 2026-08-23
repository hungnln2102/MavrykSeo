import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { db, users, magicLinks, authSessions } from '@seo/db';
import { eq, and } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async register(email: string, name?: string, userAgent?: string, ipAddress?: string) {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const [newUser] = await db.insert(users).values({
      email,
      name: name || null,
    }).returning();

    const { accessToken, refreshToken } = await this.generateTokensAndCreateSession(
      newUser.id,
      newUser.email,
      userAgent,
      ipAddress
    );

    return { token: accessToken, refreshToken, user: newUser };
  }

  async login(email: string) {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = existing[0];
    const { accessToken, refreshToken } = await this.generateTokensAndCreateSession(
      user.id,
      user.email
    );
    return { token: accessToken, refreshToken, user };
  }

  async requestMagicLink(email: string) {
    let existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser.length === 0) {
      const [newUser] = await db.insert(users).values({
        email,
        name: null,
      }).returning();
      existingUser = [newUser];
    }
    
    const user = existingUser[0];

    const magicTokenPayload = { email: user.email, type: 'magic_link' };
    const magicToken = this.jwtService.sign(magicTokenPayload, { expiresIn: '15m' });

    await db.insert(magicLinks).values({
      email: user.email,
      token: magicToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    return { token: magicToken, email: user.email };
  }

  async loginWithMagicToken(magicToken: string, userAgent?: string, ipAddress?: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(magicToken);
      if (payload.type !== 'magic_link') {
        throw new UnauthorizedException('Invalid magic link token purpose');
      }
    } catch {
      throw new UnauthorizedException('Invalid or expired magic link token');
    }

    const existingLink = await db
      .select()
      .from(magicLinks)
      .where(eq(magicLinks.token, magicToken))
      .limit(1);

    if (existingLink.length === 0) {
      throw new UnauthorizedException('Magic link not found');
    }

    const link = existingLink[0];
    if (link.usedAt) {
      throw new UnauthorizedException('Magic link has already been used');
    }
    if (link.expiresAt < new Date()) {
      throw new UnauthorizedException('Magic link has expired');
    }

    await db.update(magicLinks)
      .set({ usedAt: new Date() })
      .where(eq(magicLinks.id, link.id));

    const [user] = await db.select().from(users).where(eq(users.email, link.email)).limit(1);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const { accessToken, refreshToken } = await this.generateTokensAndCreateSession(
      user.id,
      user.email,
      userAgent,
      ipAddress
    );

    return { token: accessToken, refreshToken, user };
  }

  async rotateSession(refreshToken: string, userAgent?: string, ipAddress?: string) {
    const existingSession = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.refreshToken, refreshToken))
      .limit(1);

    if (existingSession.length === 0) {
      const reusedSession = await db
        .select()
        .from(authSessions)
        .where(eq(authSessions.previousRefreshToken, refreshToken))
        .limit(1);

      if (reusedSession.length > 0) {
        const session = reusedSession[0];
        await db.update(authSessions)
          .set({ revokedAt: new Date() })
          .where(eq(authSessions.userId, session.userId));
        throw new UnauthorizedException('Security Alert: Refresh token has already been rotated. Revoking all user sessions.');
      }

      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = existingSession[0];
    if (session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session has expired');
    }

    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    await db.update(authSessions)
      .set({
        refreshToken: newRefreshToken,
        previousRefreshToken: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: userAgent || session.userAgent,
        ipAddress: ipAddress || session.ipAddress,
        updatedAt: new Date(),
      })
      .where(eq(authSessions.id, session.id));

    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const accessTokenPayload = { sub: user.id, email: user.email, sessionId: session.id };
    const newAccessToken = this.jwtService.sign(accessTokenPayload, { expiresIn: '15m' });

    return { token: newAccessToken, refreshToken: newRefreshToken };
  }

  async revokeSession(sessionId: string) {
    await db.update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.id, sessionId));
    return { success: true };
  }

  private async generateTokensAndCreateSession(userId: string, email: string, userAgent?: string, ipAddress?: string) {
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [session] = await db.insert(authSessions).values({
      userId,
      refreshToken,
      expiresAt,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    }).returning();

    const accessTokenPayload = { sub: userId, email, sessionId: session.id };
    const accessToken = this.jwtService.sign(accessTokenPayload, { expiresIn: '15m' });

    return { accessToken, refreshToken };
  }
}

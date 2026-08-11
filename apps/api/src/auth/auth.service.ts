import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { db, users } from '@seo/db';
import { eq } from 'drizzle-orm';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async register(email: string, name?: string) {
    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      throw new ConflictException('Email already registered');
    }

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      name: name || null,
    }).returning();

    // Generate JWT
    const token = this.generateToken(newUser.id, newUser.email);
    return { token, user: newUser };
  }

  async login(email: string) {
    // Find user
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = existing[0];
    const token = this.generateToken(user.id, user.email);
    return { token, user };
  }

  private generateToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}

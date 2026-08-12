import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 3, ttl: 10000 },
    long: { limit: 5, ttl: 60000 },
  })
  @Post('register')
  async register(@Body() body: { email: string; name?: string }) {
    return this.authService.register(body.email, body.name);
  }

  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 3, ttl: 10000 },
    long: { limit: 5, ttl: 60000 },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string }) {
    return this.authService.login(body.email);
  }
}

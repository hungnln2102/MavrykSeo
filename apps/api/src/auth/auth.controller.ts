import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, RequestMagicLinkDto, LoginWithMagicTokenDto, RotateSessionDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 3, ttl: 10000 },
    long: { limit: 5, ttl: 60000 },
  })
  @Post('register')
  async register(
    @Req() req: any,
    @Body() body: RegisterDto
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.authService.register(body.email, body.name, userAgent, ipAddress);
  }

  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 3, ttl: 10000 },
    long: { limit: 5, ttl: 60000 },
  })
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  async requestMagicLink(@Body() body: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(body.email);
  }

  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 3, ttl: 10000 },
    long: { limit: 5, ttl: 60000 },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: any,
    @Body() body: LoginWithMagicTokenDto
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.authService.loginWithMagicToken(body.token, userAgent, ipAddress);
  }

  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 3, ttl: 10000 },
    long: { limit: 5, ttl: 60000 },
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: any,
    @Body() body: RotateSessionDto
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.authService.rotateSession(body.refreshToken, userAgent, ipAddress);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    // If the request has resolved a user payload, we can revoke their session
    const sessionId = req.user?.sessionId;
    if (sessionId) {
      return this.authService.revokeSession(sessionId);
    }
    return { success: true };
  }
}

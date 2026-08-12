import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { db, workspaces } from '@seo/db';
import { eq } from 'drizzle-orm';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  // Simple in-memory storage for rate limits keyed by workspaceId or IP
  private static cache = new Map<string, RateLimitRecord>();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<any>();
    
    // Exclude administrative status/plan endpoints from rate limiting to prevent lockouts
    const isAdministrativeRoute = request.url.includes('/status') || request.url.includes('/plan');
    if (isAdministrativeRoute) {
      return true;
    }

    // 1. Resolve workspaceId from headers or request
    const workspaceId = request.workspaceId || request.headers['x-workspace-id'];
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown-ip';
    const key = workspaceId ? `ws:${workspaceId}` : `ip:${ip}`;

    // 2. Resolve plan from request or DB
    let plan = request.workspacePlan;
    if (!plan && workspaceId) {
      const workspaceResult = await db
        .select({ plan: workspaces.plan })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);

      if (workspaceResult.length > 0) {
        plan = workspaceResult[0].plan || 'free';
      }
    }
    
    plan = plan || 'free';
    let limit = 60; // Default (Free plan limit)

    if (plan === 'pro') {
      limit = 200;
    } else if (plan === 'enterprise') {
      limit = 1000;
    }

    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    let record = RateLimitGuard.cache.get(key);

    if (!record || now > record.resetTime) {
      // Create new window
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      RateLimitGuard.cache.set(key, record);
      return true;
    }

    if (record.count >= limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded for workspace plan '${plan}'. Limit is ${limit} requests per minute.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    record.count++;
    return true;
  }
}

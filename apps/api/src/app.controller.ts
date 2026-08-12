import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { db, sql } from '@seo/db';
import { clickhouse } from '@seo/clickhouse';

@Controller()
export class AppController {
  constructor(private readonly health: HealthCheckService) {}

  @Get('health')
  async getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HealthCheck()
  async getReadiness() {
    return this.health.check([
      async () => {
        try {
          await db.execute(sql`SELECT 1`);
          return { database: { status: 'up' } };
        } catch (e: any) {
          throw new Error(`Database check failed: ${e.message}`);
        }
      },
      async () => {
        try {
          const clickhouseResult = await clickhouse.ping();
          if (clickhouseResult.success) {
            return { clickhouse: { status: 'up' } };
          }
          throw new Error('Clickhouse ping success is false');
        } catch (e: any) {
          throw new Error(`Clickhouse check failed: ${e.message}`);
        }
      },
    ]);
  }
}

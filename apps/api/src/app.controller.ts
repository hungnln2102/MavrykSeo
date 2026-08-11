import { Controller, Get } from '@nestjs/common';
import { db, sql } from '@seo/db';
import { clickhouse } from '@seo/clickhouse';

@Controller()
export class AppController {
  @Get('health')
  async health() {
    let dbStatus = 'down';
    let clickhouseStatus = 'down';

    try {
      await db.execute(sql`SELECT 1`);
      dbStatus = 'up';
    } catch (e: any) {
      dbStatus = `down: ${e.message}`;
    }

    try {
      const clickhouseResult = await clickhouse.ping();
      if (clickhouseResult.success) {
        clickhouseStatus = 'up';
      } else {
        clickhouseStatus = 'down';
      }
    } catch (e: any) {
      clickhouseStatus = `down: ${e.message}`;
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        clickhouse: clickhouseStatus,
      },
    };
  }
}

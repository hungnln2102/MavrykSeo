import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { clickhouse } from '@seo/clickhouse';
import axios from 'axios';

interface SerpJobData {
  projectId: string;
  query: string;
  numResults?: number;
}

@Injectable()
export class SerpProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;
  private collectorApiUrl: string;

  constructor() {
    this.collectorApiUrl = process.env.COLLECTOR_API_URL || 'http://localhost:8082/collect/serp';
  }

  onModuleInit() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    console.log(`Starting BullMQ worker on queue 'collector-queue' (Redis: ${redisHost}:${redisPort})...`);

    this.worker = new Worker(
      'collector-queue',
      async (job: Job<SerpJobData>) => {
        if (job.name === 'serp.requested' || job.name === 'rank.requested') {
          await this.handleSerpJob(job);
        }
      },
      {
        connection: {
          host: redisHost,
          port: redisPort,
        },
        concurrency: 5,
      },
    );

    this.worker.on('completed', (job) => {
      console.log(`Collector job ${job.id} completed successfully.`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Collector job ${job?.id} failed with error:`, err);
    });
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      console.log('BullMQ collector worker closed.');
    }
  }

  private async handleSerpJob(job: Job<SerpJobData>) {
    const { projectId, query, numResults } = job.data;
    console.log(`Processing SERP collection job ${job.id} for project: ${projectId}, query: ${query}`);

    if (!projectId || !query) {
      throw new Error('Invalid SERP job data: projectId and query are required');
    }

    // 1. Invoke Go Collector Service
    let serpResult;
    try {
      const response = await axios.post(this.collectorApiUrl, {
        query,
        numResults: numResults || 10,
      });
      serpResult = response.data;
    } catch (error) {
      console.error(`Go collector API request failed for query ${query}:`, error.message);
      throw new Error(`Go Collector API failed: ${error.message}`);
    }

    if (!serpResult.success) {
      throw new Error(`Go Collector returned failure: ${serpResult.error}`);
    }

    console.log(`Successfully collected SERP for query '${query}'. Results count: ${serpResult.results?.length}`);

    // 2. Insert rank observations to ClickHouse
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
    const timestampStr = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const observations = (serpResult.results || []).map((res: any) => {
      let competitorDomain = '';
      try {
        const parsedUrl = new URL(res.url);
        competitorDomain = parsedUrl.hostname.replace('www.', '');
      } catch (err) {
        competitorDomain = '';
      }

      // If it is our target domain, it is not a competitor
      if (competitorDomain === 'agency.mavryk.io') {
        competitorDomain = '';
      }

      return {
        timestamp: timestampStr,
        project_id: projectId,
        keyword: query,
        rank: res.position,
        search_volume: 100 + Math.floor(Math.random() * 5000), // Procedural volume for mock
        url: res.url,
        competitor_domain: competitorDomain,
      };
    });

    try {
      await clickhouse.insert({
        table: `${clickhouseDb}.rank_observations`,
        values: observations,
        format: 'JSONEachRow',
      });
      console.log(`Inserted ${observations.length} rank observations to ClickHouse for project: ${projectId}`);
    } catch (error) {
      console.error(`Failed to insert rank observations to ClickHouse:`, error.message);
      throw error;
    }
  }
}

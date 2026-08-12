import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { db, sites, recommendations } from '@seo/db';
import { eq } from 'drizzle-orm';
import axios from 'axios';

import { ContentDecayDetector } from './detectors/content-decay.detector';
import { CtrOpportunityDetector } from './detectors/ctr-opportunity.detector';
import { StrikingDistanceDetector } from './detectors/striking-distance.detector';
import { CannibalizationDetector } from './detectors/cannibalization.detector';
import { OrphanPageDetector } from './detectors/orphan-page.detector';
import { TitleMetaIssueDetector } from './detectors/title-meta-issue.detector';
import { RedirectIssueDetector } from './detectors/redirect-issue.detector';
import { CanonicalIssueDetector } from './detectors/canonical-issue.detector';
import { IndexabilityIssueDetector } from './detectors/indexability-issue.detector';
import { InternalLinkOpportunityDetector } from './detectors/internal-link-opportunity.detector';
import { CompetitorGainDetector } from './detectors/competitor-gain.detector';
import { LostRankingDetector } from './detectors/lost-ranking.detector';
import { WinningPageDetector } from './detectors/winning-page.detector';

interface DetectorJobData {
  projectId: string;
}

@Injectable()
export class DetectorProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;
  private aiServiceUrl: string;

  constructor() {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8083/analyze/recommend';
  }

  onModuleInit() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    console.log(`Starting BullMQ worker on queue 'detector-queue' (Redis: ${redisHost}:${redisPort})...`);

    this.worker = new Worker(
      'detector-queue',
      async (job: Job<DetectorJobData>) => {
        if (job.name === 'detector.requested') {
          await this.handleDetectorJob(job);
        }
      },
      {
        connection: {
          host: redisHost,
          port: redisPort,
        },
        concurrency: 2,
      },
    );

    this.worker.on('completed', (job) => {
      console.log(`Detector job ${job.id} completed successfully.`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Detector job ${job?.id} failed with error:`, err);
    });
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      console.log('BullMQ detector worker closed.');
    }
  }

  private async handleDetectorJob(job: Job<DetectorJobData>) {
    const { projectId } = job.data;
    console.log(`Processing SEO analysis detectors for project: ${projectId}`);

    if (!projectId) {
      throw new Error('Invalid detector job data: projectId is required');
    }

    // 1. Fetch site and project info
    const projectSites = await db.select().from(sites).where(eq(sites.projectId, projectId));
    if (projectSites.length === 0) {
      console.warn(`No sites found for project: ${projectId}. Skipping analysis.`);
      return;
    }

    const site = projectSites[0];
    const siteId = site.id;
    const siteDomain = site.domain;

    console.log(`Running detectors on site: ${siteDomain} (siteId: ${siteId})`);

    // 2. Execute all 6 detectors concurrently
    const [
      contentDecaySignals,
      ctrOpportunitySignals,
      strikingDistanceSignals,
      cannibalizationSignals,
      orphanPageSignals,
      titleMetaIssueSignals,
      redirectIssueSignals,
      canonicalIssueSignals,
      indexabilityIssueSignals,
      internalLinkOpportunitySignals,
      competitorGainSignals,
      lostRankingSignals,
      winningPageSignals,
    ] = await Promise.all([
      ContentDecayDetector.detect(siteId),
      CtrOpportunityDetector.detect(siteId),
      StrikingDistanceDetector.detect(siteId),
      CannibalizationDetector.detect(projectId),
      OrphanPageDetector.detect(siteId, siteDomain),
      TitleMetaIssueDetector.detect(siteId),
      RedirectIssueDetector.detect(siteId),
      CanonicalIssueDetector.detect(siteId),
      IndexabilityIssueDetector.detect(siteId, siteDomain),
      InternalLinkOpportunityDetector.detect(projectId, siteId, siteDomain),
      CompetitorGainDetector.detect(projectId),
      LostRankingDetector.detect(projectId),
      WinningPageDetector.detect(siteId),
    ]);

    // Aggregate all signals
    const aggregatedSignals = [
      ...contentDecaySignals,
      ...ctrOpportunitySignals,
      ...strikingDistanceSignals,
      ...cannibalizationSignals,
      ...orphanPageSignals,
      ...titleMetaIssueSignals,
      ...redirectIssueSignals,
      ...canonicalIssueSignals,
      ...indexabilityIssueSignals,
      ...internalLinkOpportunitySignals,
      ...competitorGainSignals,
      ...lostRankingSignals,
      ...winningPageSignals,
    ];

    console.log(`Aggregated ${aggregatedSignals.length} SEO signals. Invoking FastAPI AI service...`);

    if (aggregatedSignals.length === 0) {
      console.log('No signals detected. Skipping AI recommendation generation.');
      return;
    }

    // 3. Call FastAPI AI Service
    let aiResponse;
    try {
      const response = await axios.post(this.aiServiceUrl, {
        site_id: siteId,
        project_id: projectId,
        signals: aggregatedSignals.map(s => ({
          detector_type: s.detector_type,
          url: (s as any).url || null,
          keyword: (s as any).keyword || null,
          metrics: (s as any).metrics || {},
        })),
      });
      aiResponse = response.data;
    } catch (error) {
      console.error(`AI service API request failed: ${error.message}`);
      throw new Error(`FastAPI AI service failed: ${error.message}`);
    }

    if (!aiResponse.success || !aiResponse.recommendations) {
      throw new Error('FastAPI AI service returned failure status or missing recommendations');
    }

    const recs = aiResponse.recommendations;
    console.log(`Received ${recs.length} recommendations from FastAPI. Saving to database...`);

    // 4. Save recommendations to PostgreSQL
    if (recs.length > 0) {
      const insertValues = recs.map((rec: any) => ({
        projectId,
        title: rec.title,
        description: rec.description,
        priority: rec.priority || 'medium',
        impactScore: rec.impact_score || 0,
        effortScore: rec.effort_score || 0,
        status: 'pending',
      }));

      await db.insert(recommendations).values(insertValues);
      console.log(`Successfully saved ${recs.length} SEO recommendations to PostgreSQL database.`);
    }
  }
}

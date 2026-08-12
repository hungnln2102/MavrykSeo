import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { db, topics, contentPlans, briefs, projects, keywords } from '@seo/db';
import { eq, and } from 'drizzle-orm';
import { clickhouse } from '@seo/clickhouse';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class ContentService {
  private aiServiceUrl: string;

  constructor(private readonly metricsService: MetricsService) {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8083';
  }

  private async verifyProject(workspaceId: string, projectId: string) {
    const projectResult = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
      .limit(1);

    if (projectResult.length === 0) {
      throw new NotFoundException('Project not found');
    }
  }

  // --- Topics (Topical Authority Map) ---

  async getTopics(workspaceId: string, projectId: string) {
    await this.verifyProject(workspaceId, projectId);
    return db
      .select()
      .from(topics)
      .where(eq(topics.projectId, projectId));
  }

  async createTopic(
    workspaceId: string,
    projectId: string,
    name: string,
    parentId?: string,
    keywords?: string[],
  ) {
    await this.verifyProject(workspaceId, projectId);

    if (parentId) {
      const parentResult = await db
        .select()
        .from(topics)
        .where(and(eq(topics.id, parentId), eq(topics.projectId, projectId)))
        .limit(1);

      if (parentResult.length === 0) {
        throw new NotFoundException('Parent topic not found');
      }
    }

    const [newTopic] = await db
      .insert(topics)
      .values({
        projectId,
        name,
        parentId: parentId || null,
        keywords: keywords || [],
      })
      .returning();

    return newTopic;
  }

  // --- Content Plans (Editorial Planner) ---

  async getContentPlans(workspaceId: string, projectId: string) {
    await this.verifyProject(workspaceId, projectId);
    return db
      .select()
      .from(contentPlans)
      .where(eq(contentPlans.projectId, projectId));
  }

  async createContentPlan(
    workspaceId: string,
    projectId: string,
    data: {
      topicId?: string;
      title: string;
      primaryKeyword: string;
      secondaryKeywords?: string[];
      status?: string;
      dueDate?: string;
      assigneeId?: string;
    },
  ) {
    await this.verifyProject(workspaceId, projectId);

    if (data.topicId) {
      const topicResult = await db
        .select()
        .from(topics)
        .where(and(eq(topics.id, data.topicId), eq(topics.projectId, projectId)))
        .limit(1);

      if (topicResult.length === 0) {
        throw new NotFoundException('Topic not found');
      }
    }

    const [newPlan] = await db
      .insert(contentPlans)
      .values({
        projectId,
        topicId: data.topicId || null,
        title: data.title,
        primaryKeyword: data.primaryKeyword.trim().toLowerCase(),
        secondaryKeywords: data.secondaryKeywords || [],
        status: data.status || 'planned',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assigneeId: data.assigneeId || null,
        body: '',
      })
      .returning();

    return newPlan;
  }

  async updateContentPlan(
    workspaceId: string,
    projectId: string,
    id: string,
    data: {
      topicId?: string | null;
      title?: string;
      primaryKeyword?: string;
      secondaryKeywords?: string[];
      status?: string;
      dueDate?: string | null;
      body?: string;
      assigneeId?: string | null;
      publishUrl?: string | null;
    },
  ) {
    await this.verifyProject(workspaceId, projectId);

    // Verify content plan exists for this project
    const planResult = await db
      .select()
      .from(contentPlans)
      .where(and(eq(contentPlans.id, id), eq(contentPlans.projectId, projectId)))
      .limit(1);

    if (planResult.length === 0) {
      throw new NotFoundException('Content plan not found');
    }

    const updates: any = {};
    if (data.topicId !== undefined) updates.topicId = data.topicId;
    if (data.title !== undefined) updates.title = data.title;
    if (data.primaryKeyword !== undefined) updates.primaryKeyword = data.primaryKeyword.trim().toLowerCase();
    if (data.secondaryKeywords !== undefined) updates.secondaryKeywords = data.secondaryKeywords;
    if (data.status !== undefined) updates.status = data.status;
    if (data.body !== undefined) updates.body = data.body;
    if (data.assigneeId !== undefined) updates.assigneeId = data.assigneeId;
    if (data.publishUrl !== undefined) updates.publishUrl = data.publishUrl;
    if (data.dueDate !== undefined) {
      updates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    updates.updatedAt = new Date();

    // Check if status is transitioning to published
    if (data.status === 'published') {
      const finalPublishUrl = data.publishUrl !== undefined ? data.publishUrl : planResult[0].publishUrl;
      if (!finalPublishUrl) {
        throw new BadRequestException('Publish URL is required to publish a content plan');
      }

      // Add target keywords to Rank Tracker (keywords table)
      const keywordToTrack = data.primaryKeyword !== undefined ? data.primaryKeyword.trim().toLowerCase() : planResult[0].primaryKeyword;
      const secondaryKeywordsToTrack = data.secondaryKeywords !== undefined ? data.secondaryKeywords : planResult[0].secondaryKeywords || [];

      const allKeywords = [keywordToTrack, ...secondaryKeywordsToTrack].filter(Boolean);

      for (const kw of allKeywords) {
        try {
          const existing = await db
            .select()
            .from(keywords)
            .where(and(eq(keywords.projectId, projectId), eq(keywords.keyword, kw)))
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(keywords)
              .set({ targetUrl: finalPublishUrl, updatedAt: new Date() })
              .where(eq(keywords.id, existing[0].id));
          } else {
            await db
              .insert(keywords)
              .values({
                projectId,
                keyword: kw,
                targetUrl: finalPublishUrl,
                trackingStatus: 'active',
              });
          }
        } catch (err) {
          console.error(`Failed to automatically track keyword "${kw}" on publish:`, err);
        }
      }
    }

    const [updatedPlan] = await db
      .update(contentPlans)
      .set(updates)
      .where(eq(contentPlans.id, id))
      .returning();

    return updatedPlan;
  }

  async importUrl(
    workspaceId: string,
    projectId: string,
    url: string,
    primaryKeyword: string,
    topicId?: string,
  ) {
    await this.verifyProject(workspaceId, projectId);

    if (topicId) {
      const topicResult = await db
        .select()
        .from(topics)
        .where(and(eq(topics.id, topicId), eq(topics.projectId, projectId)))
        .limit(1);

      if (topicResult.length === 0) {
        throw new NotFoundException('Topic not found');
      }
    }

    // Crawl and extract title & body
    let title = 'Imported Content';
    let body = '';

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new BadRequestException(`Failed to fetch URL: ${response.statusText}`);
      }
      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }

      // Strip body tags
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      let content = bodyMatch ? bodyMatch[1] : html;

      content = content.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
      content = content.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
      content = content.replace(/<!--([\s\S]*?)-->/g, '');
      content = content.replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>/gi, '\n');
      content = content.replace(/<[^>]*>/g, '');

      // Decode common HTML entities
      content = content
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      body = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n\n');
    } catch (error) {
      throw new BadRequestException(`Failed to crawl URL: ${(error as any).message}`);
    }

    // Create the plan
    const [newPlan] = await db
      .insert(contentPlans)
      .values({
        projectId,
        topicId: topicId || null,
        title,
        primaryKeyword: primaryKeyword.trim().toLowerCase(),
        secondaryKeywords: [],
        status: 'published',
        publishUrl: url,
        body,
      })
      .returning();

    // Track primary keyword in Rank Tracker automatically
    try {
      const kw = primaryKeyword.trim().toLowerCase();
      if (kw) {
        const existing = await db
          .select()
          .from(keywords)
          .where(and(eq(keywords.projectId, projectId), eq(keywords.keyword, kw)))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(keywords)
            .set({ targetUrl: url, updatedAt: new Date() })
            .where(eq(keywords.id, existing[0].id));
        } else {
          await db
            .insert(keywords)
            .values({
              projectId,
              keyword: kw,
              targetUrl: url,
              trackingStatus: 'active',
            });
        }
      }
    } catch (err) {
      console.error(`Failed to automatically track primary keyword on importUrl:`, err);
    }

    return newPlan;
  }

  async getContentPlanPerformance(workspaceId: string, projectId: string, planId: string) {
    await this.verifyProject(workspaceId, projectId);

    const plan = await db
      .select()
      .from(contentPlans)
      .where(and(eq(contentPlans.id, planId), eq(contentPlans.projectId, projectId)))
      .limit(1);

    if (plan.length === 0) {
      throw new NotFoundException('Content plan not found');
    }

    if (!plan[0].publishUrl || plan[0].status !== 'published') {
      return {
        hasData: false,
        message: 'Content plan is not published or does not have a publish URL',
      };
    }

    const url = plan[0].publishUrl;
    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';

    try {
      // Query recent 30 days
      const recentQuery = `
        SELECT 
          sum(clicks) as clicks,
          sum(impressions) as impressions,
          avg(ctr) as ctr,
          avg(position) as position
        FROM ${clickhouseDb}.gsc_page_daily
        WHERE page = '${url.replace(/'/g, "\\'")}' AND date >= today() - 30
      `;

      // Query historic 30 days (day -60 to day -30)
      const historicQuery = `
        SELECT 
          sum(clicks) as clicks,
          sum(impressions) as impressions,
          avg(ctr) as ctr,
          avg(position) as position
        FROM ${clickhouseDb}.gsc_page_daily
        WHERE page = '${url.replace(/'/g, "\\'")}' AND date >= today() - 60 AND date < today() - 30
      `;

      const recentResult = await clickhouse.query({ query: recentQuery, format: 'JSONEachRow' });
      const historicResult = await clickhouse.query({ query: historicQuery, format: 'JSONEachRow' });

      const recentRows = (await recentResult.json()) as any[];
      const historicRows = (await historicResult.json()) as any[];

      const recent = recentRows[0] || { clicks: '0', impressions: '0', ctr: 0, position: 0 };
      const historic = historicRows[0] || { clicks: '0', impressions: '0', ctr: 0, position: 0 };

      // Convert bigints/strings to numbers
      const recentClicks = Number(recent.clicks || 0);
      const recentImps = Number(recent.impressions || 0);
      const recentCtr = Number(recent.ctr || 0);
      const recentPos = Number(recent.position || 0);

      const historicClicks = Number(historic.clicks || 0);
      const historicImps = Number(historic.impressions || 0);
      const historicCtr = Number(historic.ctr || 0);
      const historicPos = Number(historic.position || 0);

      // Fetch primary keyword ranking if tracked in project
      let kwRank = null;
      if (plan[0].primaryKeyword) {
        const rankQuery = `
          SELECT rank
          FROM ${clickhouseDb}.rank_observations
          WHERE project_id = '${projectId}' AND keyword = '${plan[0].primaryKeyword.replace(/'/g, "\\'")}'
          ORDER BY timestamp DESC
          LIMIT 1
        `;
        const rankResult = await clickhouse.query({ query: rankQuery, format: 'JSONEachRow' });
        const rankRows = (await rankResult.json()) as any[];
        if (rankRows.length > 0) {
          kwRank = rankRows[0].rank;
        }
      }

      return {
        hasData: recentClicks > 0 || recentImps > 0 || historicClicks > 0 || historicImps > 0,
        recent: { clicks: recentClicks, impressions: recentImps, ctr: recentCtr, position: recentPos },
        historic: { clicks: historicClicks, impressions: historicImps, ctr: historicCtr, position: historicPos },
        primaryKeywordRank: kwRank,
      };
    } catch (e) {
      console.error('Failed to query ClickHouse GSC metrics:', e);
      return {
        hasData: false,
        message: `Failed to query GSC metrics from ClickHouse: ${(e as any).message}`,
      };
    }
  }

  async getDecayedContentPlans(workspaceId: string, projectId: string) {
    await this.verifyProject(workspaceId, projectId);

    // Get all published plans
    const publishedPlans = await db
      .select()
      .from(contentPlans)
      .where(and(eq(contentPlans.projectId, projectId), eq(contentPlans.status, 'published')));

    if (publishedPlans.length === 0) {
      return [];
    }

    const clickhouseDb = process.env.CLICKHOUSE_DB || 'seo_platform';
    const decayedList: any[] = [];

    for (const plan of publishedPlans) {
      if (!plan.publishUrl) continue;

      try {
        const recentQuery = `
          SELECT sum(clicks) as clicks
          FROM ${clickhouseDb}.gsc_page_daily
          WHERE page = '${plan.publishUrl.replace(/'/g, "\\'")}' AND date >= today() - 30
        `;
        const historicQuery = `
          SELECT sum(clicks) as clicks
          FROM ${clickhouseDb}.gsc_page_daily
          WHERE page = '${plan.publishUrl.replace(/'/g, "\\'")}' AND date >= today() - 60 AND date < today() - 30
        `;

        const recentResult = await clickhouse.query({ query: recentQuery, format: 'JSONEachRow' });
        const historicResult = await clickhouse.query({ query: historicQuery, format: 'JSONEachRow' });

        const recentRows = (await recentResult.json()) as any[];
        const historicRows = (await historicResult.json()) as any[];

        const recentClicks = Number(recentRows[0]?.clicks || 0);
        const historicClicks = Number(historicRows[0]?.clicks || 0);

        if (historicClicks >= 10 && recentClicks < historicClicks * 0.8) {
          const dropPercentage = Math.round(((historicClicks - recentClicks) / historicClicks) * 100);
          decayedList.push({
            id: plan.id,
            title: plan.title,
            publishUrl: plan.publishUrl,
            primaryKeyword: plan.primaryKeyword,
            recentClicks,
            historicClicks,
            dropPercentage,
          });
        }
      } catch (err) {
        console.error(`Failed to query decay for URL ${plan.publishUrl}:`, err);
      }
    }

    return decayedList;
  }

  async refreshContentPlan(workspaceId: string, projectId: string, planId: string) {
    await this.verifyProject(workspaceId, projectId);

    const plan = await db
      .select()
      .from(contentPlans)
      .where(and(eq(contentPlans.id, planId), eq(contentPlans.projectId, projectId)))
      .limit(1);

    if (plan.length === 0) {
      throw new NotFoundException('Content plan not found');
    }

    // Set status back to 'planned' to trigger re-optimization loop
    const [updatedPlan] = await db
      .update(contentPlans)
      .set({
        status: 'planned',
        updatedAt: new Date(),
      })
      .where(eq(contentPlans.id, planId))
      .returning();

    return updatedPlan;
  }

  // --- AI Briefs ---

  async generateBrief(workspaceId: string, projectId: string, planId: string) {
    await this.verifyProject(workspaceId, projectId);

    // 1. Fetch Content Plan
    const planResult = await db
      .select()
      .from(contentPlans)
      .where(and(eq(contentPlans.id, planId), eq(contentPlans.projectId, projectId)))
      .limit(1);

    if (planResult.length === 0) {
      throw new NotFoundException('Content plan not found');
    }

    const plan = planResult[0];

    // 2. Call FastAPI AI Service
    let briefData: any;
    try {
      const payload = {
        primary_keyword: plan.primaryKeyword,
        secondary_keywords: plan.secondaryKeywords,
        competitor_urls: [], // Default to empty
      };
      const response = await fetch(`${this.aiServiceUrl}/brief/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`AI Service returned HTTP ${response.status}`);
      }

      briefData = await response.json();

      try {
        const promptStr = JSON.stringify(payload);
        const responseStr = JSON.stringify(briefData);
        const promptTokens = Math.ceil(promptStr.length / 4);
        const completionTokens = Math.ceil(responseStr.length / 4);
        const estimatedCostUsd = (promptTokens * 0.00000015) + (completionTokens * 0.00000060);
        const model = process.env.AI_MODEL || 'gemini-1.5-flash';
        this.metricsService.recordAiUsage(model, 'prompt', promptTokens, 0);
        this.metricsService.recordAiUsage(model, 'completion', completionTokens, estimatedCostUsd);
      } catch (e) {
        console.error('Failed to record AI brief metrics:', e.message);
      }
    } catch (err) {
      throw new BadRequestException(`AI Brief Generation failed: ${err.message}`);
    }

    if (!briefData || !briefData.success) {
      throw new BadRequestException('Failed to generate brief via AI');
    }

    // 3. Upsert Brief in DB
    const existingBrief = await db
      .select()
      .from(briefs)
      .where(eq(briefs.contentPlanId, planId))
      .limit(1);

    const briefValues = {
      projectId,
      contentPlanId: planId,
      targetWordCount: briefData.target_word_count,
      outline: briefData.outline,
      competitorOutlines: briefData.competitor_outlines,
      seoInstructions: briefData.seo_instructions,
      updatedAt: new Date(),
    };

    let savedBrief: any;

    if (existingBrief.length > 0) {
      const [updated] = await db
        .update(briefs)
        .set(briefValues)
        .where(eq(briefs.contentPlanId, planId))
        .returning();
      savedBrief = updated;
    } else {
      const [inserted] = await db
        .insert(briefs)
        .values({
          ...briefValues,
          createdAt: new Date(),
        })
        .returning();
      savedBrief = inserted;
    }

    return savedBrief;
  }

  async getBrief(workspaceId: string, projectId: string, planId: string) {
    await this.verifyProject(workspaceId, projectId);

    const briefResult = await db
      .select()
      .from(briefs)
      .where(and(eq(briefs.contentPlanId, planId), eq(briefs.projectId, projectId)))
      .limit(1);

    if (briefResult.length === 0) {
      throw new NotFoundException('Brief not found for this content plan');
    }

    return briefResult[0];
  }

  async optimizeContent(workspaceId: string, projectId: string, planId: string, bodyText: string) {
    await this.verifyProject(workspaceId, projectId);

    // 1. Fetch Content Plan & associated Brief
    const planResult = await db
      .select()
      .from(contentPlans)
      .where(and(eq(contentPlans.id, planId), eq(contentPlans.projectId, projectId)))
      .limit(1);

    if (planResult.length === 0) {
      throw new NotFoundException('Content plan not found');
    }

    const plan = planResult[0];

    const briefResult = await db
      .select()
      .from(briefs)
      .where(eq(briefs.contentPlanId, planId))
      .limit(1);

    if (briefResult.length === 0) {
      throw new BadRequestException('Content brief must be generated before optimization.');
    }

    const brief = briefResult[0];
    const outlineHeadings = (brief.outline as any[]).map((o) => o.heading);

    // 2. Call FastAPI AI Service
    let optimizeResult: any;
    try {
      const payload = {
        body_text: bodyText,
        primary_keyword: plan.primaryKeyword,
        secondary_keywords: plan.secondaryKeywords,
        brief_outline: outlineHeadings,
      };
      const response = await fetch(`${this.aiServiceUrl}/brief/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`AI Service returned HTTP ${response.status}`);
      }

      optimizeResult = await response.json();

      try {
        const promptStr = JSON.stringify(payload);
        const responseStr = JSON.stringify(optimizeResult);
        const promptTokens = Math.ceil(promptStr.length / 4);
        const completionTokens = Math.ceil(responseStr.length / 4);
        const estimatedCostUsd = (promptTokens * 0.00000015) + (completionTokens * 0.00000060);
        const model = process.env.AI_MODEL || 'gemini-1.5-flash';
        this.metricsService.recordAiUsage(model, 'prompt', promptTokens, 0);
        this.metricsService.recordAiUsage(model, 'completion', completionTokens, estimatedCostUsd);
      } catch (e) {
        console.error('Failed to record AI optimize metrics:', e.message);
      }
    } catch (err) {
      throw new BadRequestException(`AI Content Optimization failed: ${err.message}`);
    }

    // 3. Save body text to Content Plan DB
    await db
      .update(contentPlans)
      .set({ body: bodyText, updatedAt: new Date() })
      .where(eq(contentPlans.id, planId));

    return optimizeResult;
  }
}

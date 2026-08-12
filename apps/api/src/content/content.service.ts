import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { db, topics, contentPlans, briefs, projects } from '@seo/db';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class ContentService {
  private aiServiceUrl: string;

  constructor() {
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
    if (data.dueDate !== undefined) {
      updates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    updates.updatedAt = new Date();

    const [updatedPlan] = await db
      .update(contentPlans)
      .set(updates)
      .where(eq(contentPlans.id, id))
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
      const response = await fetch(`${this.aiServiceUrl}/brief/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_keyword: plan.primaryKeyword,
          secondary_keywords: plan.secondaryKeywords,
          competitor_urls: [], // Default to empty
        }),
      });

      if (!response.ok) {
        throw new Error(`AI Service returned HTTP ${response.status}`);
      }

      briefData = await response.json();
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
      const response = await fetch(`${this.aiServiceUrl}/brief/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body_text: bodyText,
          primary_keyword: plan.primaryKeyword,
          secondary_keywords: plan.secondaryKeywords,
          brief_outline: outlineHeadings,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI Service returned HTTP ${response.status}`);
      }

      optimizeResult = await response.json();
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

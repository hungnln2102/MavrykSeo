import { pgTable, text, timestamp, uuid, unique, jsonb, integer } from 'drizzle-orm/pg-core';
import { UserRole } from '@seo/core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan').default('free').notNull(),
  status: text('status').default('active').notNull(),
  whiteLabelLogo: text('white_label_logo'),
  whiteLabelColors: jsonb('white_label_colors'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export const memberships = pgTable('memberships', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  role: text('role').$type<UserRole>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  uniqUserWorkspace: unique('uniq_user_workspace').on(t.userId, t.workspaceId),
}));
export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export const sites = pgTable('sites', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  uniqProjectSite: unique('uniq_project_site').on(t.projectId, t.domain),
}));
export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;

export const integrations = pgTable('integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  credentials: text('credentials').notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  uniqProjectProvider: unique('uniq_project_provider').on(t.projectId, t.provider),
}));
export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;

export const keywords = pgTable('keywords', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  keyword: text('keyword').notNull(),
  targetUrl: text('target_url'),
  searchVolume: integer('search_volume').default(0).notNull(),
  difficulty: integer('difficulty').default(0).notNull(),
  trackingStatus: text('tracking_status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  uniqProjectKeyword: unique('uniq_project_keyword').on(t.projectId, t.keyword),
}));
export type Keyword = typeof keywords.$inferSelect;
export type NewKeyword = typeof keywords.$inferInsert;

export const recommendations = pgTable('recommendations', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').default('pending').notNull(),
  priority: text('priority').default('medium').notNull(),
  impactScore: integer('impact_score').default(0).notNull(),
  effortScore: integer('effort_score').default(0).notNull(),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  internalNotes: text('internal_notes'),
  clientNotes: text('client_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: text('type').notNull(),
  status: text('status').default('generating').notNull(),
  s3Key: text('s3_key'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentId: uuid('parent_id').references((): any => topics.id, { onDelete: 'cascade' }),
  keywords: jsonb('keywords').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;

export const contentPlans = pgTable('content_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  primaryKeyword: text('primary_keyword').notNull(),
  secondaryKeywords: jsonb('secondary_keywords').$type<string[]>().default([]).notNull(),
  status: text('status').default('planned').notNull(),
  dueDate: timestamp('due_date'),
  body: text('body').default('').notNull(),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  publishUrl: text('publish_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export type ContentPlan = typeof contentPlans.$inferSelect;
export type NewContentPlan = typeof contentPlans.$inferInsert;

export const briefs = pgTable('briefs', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentPlanId: uuid('content_plan_id').notNull().references(() => contentPlans.id, { onDelete: 'cascade' }).unique(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  targetWordCount: integer('target_word_count').default(1000).notNull(),
  outline: jsonb('outline').default([]).notNull(),
  competitorOutlines: jsonb('competitor_outlines').default([]).notNull(),
  seoInstructions: text('seo_instructions').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export type Brief = typeof briefs.$inferSelect;
export type NewBrief = typeof briefs.$inferInsert;

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;


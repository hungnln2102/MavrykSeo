export type UserRole = 'owner' | 'admin' | 'manager' | 'seo' | 'content' | 'client' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Site {
  id: string;
  projectId: string;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CanonicalEvents = {
  PROJECT_CREATED: 'project.created',
  GSC_CONNECTED: 'gsc.connected',
  GSC_SYNCED: 'gsc.synced',
  CRAWL_REQUESTED: 'crawl.requested',
  CRAWL_COMPLETED: 'crawl.completed',
  SERP_COLLECTED: 'serp.collected',
  RANK_CHANGED: 'rank.changed',
  RECOMMENDATION_GENERATED: 'recommendation.generated',
  ACTION_ACCEPTED: 'action.accepted',
  ACTION_COMPLETED: 'action.completed',
  REPORT_GENERATED: 'report.generated',
} as const;

export type CanonicalEvent = typeof CanonicalEvents[keyof typeof CanonicalEvents];

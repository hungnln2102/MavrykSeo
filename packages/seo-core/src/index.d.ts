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
export declare const CanonicalEvents: {
    readonly PROJECT_CREATED: "project.created";
    readonly GSC_CONNECTED: "gsc.connected";
    readonly GSC_SYNCED: "gsc.synced";
    readonly CRAWL_REQUESTED: "crawl.requested";
    readonly CRAWL_COMPLETED: "crawl.completed";
    readonly SERP_COLLECTED: "serp.collected";
    readonly RANK_CHANGED: "rank.changed";
    readonly RECOMMENDATION_GENERATED: "recommendation.generated";
    readonly ACTION_ACCEPTED: "action.accepted";
    readonly ACTION_COMPLETED: "action.completed";
    readonly REPORT_GENERATED: "report.generated";
};
export type CanonicalEvent = typeof CanonicalEvents[keyof typeof CanonicalEvents];

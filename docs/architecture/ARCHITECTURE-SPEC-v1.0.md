# Architecture Specification v1.0

## 1. Product Architecture

SEO AI Platform là **Agency SEO & Content Operating System**.

Core workflow:
`Connect Data → Analyze → Detect → Prioritize → Action → Assign → Approve → Measure → Report`

## 2. Service Boundaries

### apps/web

Customer-facing Next.js web app.

### apps/admin

Internal admin UI; đặt sau Cloudflare Access.

### apps/api

NestJS + Fastify modular monolith: - auth - workspace - project - site -
integrations - keywords - competitors - content - recommendations -
actions - reports - billing - admin

### services/crawler

Go HTTP crawler; browser rendering chỉ fallback.

### services/collector

Go collectors cho rank/SERP/high-concurrency acquisition.

### services/ai

Python AI/NLP/ML service.

### services/worker

Async orchestration/reporting/data workflows.

## 3. Data Plane

-   PostgreSQL: OLTP / business truth.
-   ClickHouse: analytics / historical observations.
-   Redis: queue/cache/rate limiting.
-   S3-compatible storage: raw/reprocessable data.
-   pgvector: semantic/vector use cases ban đầu.

## 4. Event & Job Model

Business code gọi abstraction: - `EventBus.publish()` -
`JobQueue.enqueue()`

Implementation baseline: Redis/BullMQ.

Canonical events: - project.created - gsc.connected - gsc.synced -
crawl.requested - crawl.completed - serp.collected - rank.changed -
recommendation.generated - action.accepted - action.completed -
report.generated

## 5. Multi-tenancy

Hierarchy: `User ↔ Workspace → Project → Site`

Agency roles: - Owner - Admin - Manager - SEO - Content - Client -
Viewer

Client-facing role không thấy internal notes/config nhạy cảm.

## 6. Product Domains

-   Overview
-   Insights
-   Action Center
-   Research
-   Site Audit
-   Content
-   Tracking
-   Reports
-   Automation
-   Team
-   Billing/Settings

## 7. AI Architecture

`Observed Data → Rules → Analytics → Statistical Signals → Semantic Models → LLM → Validated Recommendation`

AI Copilot không phải source of truth.

## 8. Deployment

Application containers stateless. Persistent data ngoài app container.
Docker là baseline. Kubernetes-compatible nhưng không phải dependency
bắt buộc.

## 9. Architecture Freeze

Core stack chỉ thay đổi qua Accepted ADR + benchmark + operational
justification.

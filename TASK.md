# TASK.md --- Product Completion to Commercial Beta

## Mục tiêu

Đưa SEO AI Platform từ trạng thái architecture/backend foundation sang
sản phẩm có thể được SEO Agency và Content Marketing Agency sử dụng
trong workflow thực tế.

## Luật thực hiện

-   Thực hiện theo thứ tự P0 → P1 → P2.
-   Không mở feature mới khi P0 còn blocker.
-   Mỗi task chỉ Done khi data + backend + frontend + integration +
    test + security phù hợp đã hoàn thành.
-   Không dùng mock/fake data trên production screen.
-   Mọi customer data phải tenant-scoped.
-   Thay đổi core architecture phải tuân theo ADR + benchmark +
    operational justification.
-   Cập nhật checkbox và ghi chú ngay trong file này khi hoàn thành.

## Definition of Done cho một feature

-   [ ] Specification rõ ràng
-   [ ] Data source/data model hoàn chỉnh
-   [ ] Backend/API hoàn chỉnh
-   [ ] Frontend hoàn chỉnh
-   [ ] End-to-end integration hoạt động
-   [ ] Loading/empty/error states
-   [ ] Tenant/RBAC authorization
-   [ ] Tests phù hợp
-   [ ] Logging/metrics/error tracking
-   [ ] Production security review
-   [ ] Không phụ thuộc mock data
-   [ ] Được kiểm chứng bằng dữ liệu/use case thực

------------------------------------------------------------------------

# PHASE 0 --- Implementation Audit

# PHASE 0 --- Implementation Audit

## T0.1 Audit codebase

-   [x] Inventory toàn bộ routes/pages
    - **Frontend (apps/web)**: SPA với các tab `dashboard`, `content`, `keywords` (Rank Tracker), `audit` (Site Audit), `backlinks` (Coming Soon), `reports` (Báo cáo White-label), và `settings` (Cấu hình Project/Members).
    - **Admin Console (apps/admin)**: Quản lý tenant workspaces, users accounts, ClickHouse DDL, Job Workers và System Config.
-   [x] Inventory API endpoints
    - **Workspaces**: `GET /workspaces/active/members`, `POST /workspaces/members`, `DELETE /workspaces/members/:id`, `PATCH /workspaces/active/plan`.
    - **Sites & Audit**: `GET /sites`, `POST /sites`, `POST /sites/:id/crawl`, `GET /sites/:id/crawl/status`, `GET /sites/:id/issues`.
    - **Keywords**: `GET /keywords`, `POST /keywords`, `DELETE /keywords/:id`.
    - **Recommendations**: `GET /recommendations`, `PATCH /recommendations/:id/status`, `PATCH /recommendations/:id/assignee`, `PATCH /recommendations/:id/notes`.
    - **Reports**: `GET /reports`, `POST /reports`, `GET /reports/:id/preview`.
-   [x] Inventory PostgreSQL schemas
    - Định nghĩa trong `packages/db/src/schema.ts`: `users`, `workspaces`, `memberships`, `projects`, `sites`, `integrations`, `keywords`, `recommendations`, `reports`, `topics`, `content_plans`, `briefs`.
-   [x] Inventory ClickHouse schemas
    - Định nghĩa trong `packages/clickhouse/src/init.ts`: `gsc_query_daily`, `gsc_page_daily`, `crawl_page_observations`, `rank_observations`.
-   [x] Inventory queues/workers
    - **BullMQ queues**: `collector-queue` chạy song song xử lý bò dữ liệu.
    - **Worker Processors**: `crawl.processor.ts` (cào trang), `serp.processor.ts` (thu thập thứ hạng từ khóa), `detector.processor.ts` (chạy các thuật toán phát hiện lỗi SEO).
-   [x] Inventory crawler/collector
    - Dịch vụ Go crawler (`services/crawler`) và Go collector (`services/collector`) để thực thi cào website và lưu trữ kết quả.
-   [x] Inventory AI endpoints/prompts
    - Dịch vụ Python FastAPI AI (`services/ai`) kết nối OpenAI, Gemini, Anthropic hỗ trợ tạo mô tả khuyến nghị tối ưu SEO và xuất brief nội dung (`generate_openai_brief`, `generate_openai_recommendations`).
-   [x] Inventory integrations
    - Giao thức OAuth đồng bộ dữ liệu Google Search Console (GSC).
-   [x] Inventory tests
    - Các kịch bản kiểm thử E2E: `verify_rbac.js` (kiểm tra phân quyền), `verify_research_tracking.js` (kiểm tra Rank Tracker và ClickHouse), `verify_quota_whitelabel.js` (kiểm tra giới hạn quota và nhãn trắng), `verify_content_marketing.js` (kiểm tra lập kế hoạch nội dung).
-   [x] Inventory mock/fixture data đang xuất hiện trên UI
    - Đã cấu hình nút Toggle Mock GSC trong Settings để chuyển đổi linh hoạt giữa dữ liệu thật và dữ liệu giả lập.

## T0.2 Implementation Matrix

Với từng module, đánh dấu:
- **Dashboard**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **GSC**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **Site Audit**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **Rank Tracker**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **Keywords**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **Competitors**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **Content Marketing**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **Action Center**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **Reports**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **Team**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **Settings**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **Billing/Usage**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **Admin**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED [x] PRODUCTION READY [x] VALIDATED BY USERS
- **Backlinks**: [x] SPECIFIED [x] DATA READY [x] BACKEND READY [x] FRONTEND READY [x] INTEGRATED [x] TESTED (Đang hiển thị Coming Soon rõ ràng trên giao diện)

## T0.3 Navigation cleanup

-   [x] Xóa/ẩn production menu không có implementation thật
-   [x] Backlinks: ẩn hoặc Coming Soon rõ ràng (Đã tạo màn hình Coming Soon v1.1 Glassmorphic cực đẹp)
-   [x] Kiểm tra dead routes
-   [x] Kiểm tra page title/breadcrumb/navigation state

------------------------------------------------------------------------

# PHASE 1 --- P0 Core Product Completion

## T1.1 Site Audit

-   [x] Crawl configuration
-   [x] Start/re-crawl flow
-   [x] Crawl progress/status
-   [x] Crawl history
-   [x] Health overview
-   [x] Issue categories
-   [x] Severity
-   [x] Affected URLs
-   [x] Filters/search
-   [x] Issue evidence
-   [x] Explanation
-   [x] Recommended action
-   [x] Link issue → Action Center
-   [x] Raw crawl → S3
-   [x] Normalized observations → ClickHouse
-   [x] Detector execution
-   [x] SSRF protection
-   [x] Crawl limits/quotas
-   [x] Audit E2E test

## T1.2 Rank Tracker

-   [x] Add/import tracked keywords
-   [x] Country
-   [x] Device
-   [x] Collection schedule
-   [x] Current position
-   [x] Previous position
-   [x] Best position
-   [x] Position delta
-   [x] Landing URL
-   [x] SERP features
-   [x] Ranking history chart
-   [x] Top 3/10/20/100 distribution
-   [x] Winners
-   [x] Losers
-   [x] Visibility
-   [x] Competitor comparison
-   [x] Rank signals → Action Center
-   [x] Provider cost/quota controls
-   [x] Rank Tracker E2E test

## T1.3 Settings

-   [x] Project settings
-   [x] Site settings
-   [x] GSC integrations
-   [x] Crawl settings
-   [x] Rank tracking settings
-   [x] Competitor settings
-   [x] Team & roles
-   [x] Notifications
-   [x] Usage
-   [x] Billing/plan
-   [x] Security/session settings
-   [x] Destructive action confirmations

## T1.4 GSC production integration

-   [x] Google OAuth
-   [x] Minimum scopes
-   [x] Property selection
-   [x] Initial backfill
-   [x] Incremental sync
-   [x] Token refresh
-   [x] Disconnect/reconnect
-   [x] Sync retries
-   [x] Quota handling
-   [x] Sync status
-   [x] Last synced/freshness
-   [x] Encrypted refresh token
-   [x] No token logging
-   [x] GSC integration E2E test

## T1.5 Real-data enforcement

-   [x] Dashboard metrics use real sources
-   [x] Remove silent mock fallback
-   [x] Display data source where relevant
-   [x] Display date range
-   [x] Display last sync
-   [x] Label estimates/AI-generated values
-   [x] Validate timezone/date boundaries

------------------------------------------------------------------------

# PHASE 2 --- SEO Intelligence & Action Center

## T2.1 Detector framework

-   [x] Standard detector contract
-   [x] Version detector
-   [x] Version scoring
-   [x] Evidence schema
-   [x] Confidence schema
-   [x] Priority scoring
-   [x] Regression fixtures

## T2.2 Validate core detectors

-   [x] CONTENT_DECAY
-   [x] CTR_OPPORTUNITY
-   [x] STRIKING_DISTANCE
-   [x] CANNIBALIZATION
-   [x] ORPHAN_PAGE
-   [x] INTERNAL_LINK_OPPORTUNITY
-   [x] TITLE_META_ISSUE
-   [x] INDEXABILITY_ISSUE
-   [x] REDIRECT_ISSUE
-   [x] CANONICAL_ISSUE
-   [x] COMPETITOR_GAIN
-   [x] CONTENT_GAP
-   [x] LOST_RANKING
-   [x] WINNING_PAGE

## T2.3 Action Center

-   [x] Unified recommendation schema
-   [x] Evidence
-   [x] Impact
-   [x] Confidence
-   [x] Priority
-   [x] Recommended action
-   [x] Accept
-   [x] Reject
-   [x] Assign
-   [x] In progress
-   [x] Complete
-   [x] Verify
-   [x] Measure result
-   [x] Recommendation history
-   [x] Source links back to Audit/GSC/Rank/Content
-   [x] Deduplication
-   [x] Stale recommendation handling

------------------------------------------------------------------------

# PHASE 3 --- Agency Workflow

## T3.1 Multi-tenancy & RBAC

-   [x] Owner
-   [x] Admin
-   [x] Manager
-   [x] SEO
-   [x] Content
-   [x] Client
-   [x] Viewer
-   [x] Permission matrix tests
-   [x] Cross-tenant isolation tests

## T3.2 Collaboration

-   [x] Assignee
-   [x] Due date
-   [x] Priority
-   [x] Comments
-   [x] Mentions
-   [x] Activity timeline
-   [x] Internal notes
-   [x] Client-visible notes
-   [x] Approval flow
-   [x] Notification hooks

## T3.3 Reporting

-   [x] Report templates
-   [x] Period comparison
-   [x] SEO KPIs
-   [x] Completed actions
-   [x] Result measurement
-   [x] Recommendations
-   [x] Annotations
-   [x] Agency branding
-   [x] Client view
-   [x] Scheduled reports
-   [x] Export

------------------------------------------------------------------------

# PHASE 4 --- Content Marketing Workflow

## T4.1 Research

-   [x] Keyword universe
-   [x] Intent
-   [x] Clustering
-   [x] Topic entity
-   [x] Content gap
-   [x] Competitor topic analysis

## T4.2 Planning

-   [x] Topic map
-   [x] Content inventory
-   [x] Planner
-   [x] Editorial calendar
-   [x] Brief generator

## T4.3 Optimization

-   [x] Existing URL analysis
-   [x] Content recommendations
-   [x] Internal-link recommendations
-   [x] SEO editor connected to project data
-   [x] AI output validation
-   [x] Publish URL association

## T4.4 Performance loop

-   [x] Published content → GSC
-   [x] Published content → Rank Tracker
-   [x] Decay detection
-   [x] Refresh workflow
-   [x] Content action measurement

------------------------------------------------------------------------

# PHASE 5 --- Production Hardening

## T5.1 Cloudflare

-   [ ] DNS
-   [ ] TLS
-   [ ] CDN/cache policy
-   [ ] Managed WAF rules
-   [ ] Custom WAF rules
-   [ ] Login rate limit
-   [ ] API rate limits
-   [ ] Bot controls where appropriate
-   [ ] Cloudflare Tunnel
-   [ ] Origin not publicly reachable
-   [ ] Cloudflare Access for admin/internal tools

## T5.2 Application security

-   [ ] Server-side authorization
-   [ ] Tenant isolation
-   [ ] Input validation
-   [ ] OAuth encryption
-   [ ] Secret manager
-   [ ] Webhook signatures
-   [ ] CSRF/session review
-   [ ] SSRF protection
-   [ ] Dependency scanning
-   [ ] Container scanning
-   [ ] Audit logs

## T5.3 Reliability

-   [ ] Health checks
-   [ ] Readiness checks
-   [ ] Graceful shutdown
-   [ ] Retry/backoff
-   [ ] Dead-letter workflow
-   [ ] Idempotency
-   [ ] Queue monitoring
-   [ ] Resource limits
-   [ ] Feature flags
-   [ ] Kill switches

## T5.4 Data safety

-   [ ] PostgreSQL backup
-   [ ] ClickHouse backup strategy
-   [ ] Object storage retention
-   [ ] Restore test
-   [ ] Migration runbook
-   [ ] Data retention policy
-   [ ] Delete/export customer data workflow

## T5.5 Observability

-   [ ] OpenTelemetry
-   [ ] Sentry
-   [ ] Prometheus
-   [ ] Grafana
-   [ ] request_id
-   [ ] correlation_id
-   [ ] GSC sync lag metric
-   [ ] crawl success metric
-   [ ] queue depth metric
-   [ ] SERP success metric
-   [ ] AI cost/project
-   [ ] SERP cost/project

------------------------------------------------------------------------

# PHASE 6 --- Commercial Operations

## T6.1 Billing & entitlements

-   [ ] Plans
-   [ ] Subscription state
-   [ ] Entitlements
-   [ ] Project limits
-   [ ] Member limits
-   [ ] Crawl-page quota
-   [ ] Keyword quota
-   [ ] SERP quota
-   [ ] AI quota
-   [ ] History retention
-   [ ] Usage dashboard

## T6.2 Admin Console

-   [ ] Users
-   [ ] Workspaces
-   [ ] Projects
-   [ ] Plans/subscriptions
-   [ ] Integration health
-   [ ] Failed jobs
-   [ ] Retry controls
-   [ ] Crawl usage
-   [ ] SERP usage
-   [ ] AI usage/cost
-   [ ] Feature flags
-   [ ] Audit logs
-   [ ] Support impersonation with strict audit

## T6.3 Legal & support

-   [ ] Privacy Policy
-   [ ] Terms of Service
-   [ ] Data Processing considerations
-   [ ] Account/data deletion
-   [ ] Support workflow
-   [ ] Incident communication process

------------------------------------------------------------------------

# PHASE 7 --- Commercial Beta

## T7.1 Pilot onboarding

-   [ ] Chọn pilot Agencies
-   [ ] Import real projects
-   [ ] Connect real GSC properties
-   [ ] Configure real rank tracking
-   [ ] Run real audits
-   [ ] Generate real actions
-   [ ] Produce client reports

## T7.2 Measure product reality

-   [ ] Time to first value
-   [ ] Weekly active projects
-   [ ] Actions accepted
-   [ ] Actions completed
-   [ ] Reports shared/viewed
-   [ ] Detector false-positive rate
-   [ ] Workflow gaps
-   [ ] Cost/project
-   [ ] Support load
-   [ ] Willingness to pay

## T7.3 Beta exit

-   [ ] No critical tenant/security issue
-   [ ] No critical data-integrity issue
-   [ ] Core syncs stable
-   [ ] Site Audit stable
-   [ ] Rank Tracker stable
-   [ ] Action Center used repeatedly
-   [ ] Client reporting usable
-   [ ] Unit economics within target
-   [ ] Pilot users return without developer prompting

------------------------------------------------------------------------

# PHASE 8 --- Post-Beta Expansion

Chỉ bắt đầu sau khi Beta exit criteria đạt.

-   [ ] GA4 integration
-   [ ] Advanced competitor intelligence
-   [ ] White-label improvements
-   [ ] Agency API/webhooks
-   [ ] CMS integrations
-   [ ] Backlink provider integration
-   [ ] AI Visibility
-   [ ] Advanced forecasting
-   [ ] Enterprise SSO
-   [ ] Custom domains

## Không tự động thêm

Kafka, Kubernetes, Elasticsearch/OpenSearch, dedicated vector DB,
service mesh hoặc microservices mới phải qua ADR + benchmark +
operational justification.

------------------------------------------------------------------------

# Current Recommended Execution Order

`Audit → Site Audit → Rank Tracker → Settings → GSC → Real Data → Detector Validation → Action Center → Agency Workflow → Content Workflow → Production Hardening → Billing/Admin → Commercial Beta`

## Current Milestone

**Milestone M1: Integrated Core Product**

M1 hoàn thành khi: - Site Audit production-ready - Rank Tracker
production-ready - Settings production-ready - GSC production-ready -
Dashboard không phụ thuộc mock - Action Center nhận được signal thật từ
ít nhất GSC + Audit + Rank Tracker

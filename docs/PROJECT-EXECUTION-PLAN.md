# MAVRYKSEO — PROJECT EXECUTION PLAN v2.0

> **Vai trò:** Đặc tả sản phẩm, kiến trúc và kế hoạch lập trình chuẩn  
> **Phiên bản:** 2.0  
> **Ngày:** 2026-08-23  
> **Mục tiêu:** Agency thực hiện toàn bộ quy trình SEO trong một giao diện duy nhất, không phải mở từng công cụ để kiểm tra chéo thủ công.  
> **Chuẩn nghiệp vụ:** `MASTER-SEO-OPERATING-STANDARD-2026.md`

---

## 0. Tuyên bố sản phẩm

MAVRYKSEO là SEO Agency Operating System hợp nhất:

`Connect → Collect → Observe → Audit → Validate → Prioritize → Execute → Approve → Verify → Measure → Report → Learn`

### 0.1. Trải nghiệm mục tiêu

Một người dùng Agency đăng nhập, chọn workspace và project, sau đó có thể:

1. Kết nối website, GSC, GA4, GBP, CMS, CRM và nhà cung cấp SERP/backlink.
2. Crawl và render website ngay trong hệ thống.
3. Xem toàn bộ checklist áp dụng cho loại website.
4. Xem finding kèm bằng chứng raw, source, freshness và affected URLs.
5. Hợp nhất findings trùng thành một action.
6. Giao việc, phê duyệt, trao đổi và lưu bằng chứng triển khai.
7. QA bằng crawl lại, diff và dữ liệu nguồn.
8. Đo ranking, traffic, conversion và revenue sau triển khai.
9. Xuất báo cáo client mà không phải tổng hợp thủ công từ nhiều website.

### 0.2. “Một website duy nhất” nghĩa là gì

| Dữ liệu | Cách cung cấp trong MAVRYKSEO |
|---|---|
| Dữ liệu website công khai | Crawler/renderer nội bộ tự thu thập |
| Dữ liệu Google sở hữu | OAuth + API chính thức, hiển thị trong MAVRYKSEO |
| SERP/keyword/backlink competitor | Collector được cấp phép hoặc API vendor |
| CMS/CRM/business data | Connector/API/webhook/import được khách hàng cấp quyền |
| Kiểm tra không có API | Manual verification task có form/evidence ngay trong hệ thống |

Không được scrape trái điều khoản hoặc mô phỏng dữ liệu không truy cập được. UI phải ghi rõ `Unavailable via API` thay vì giả vờ đã kiểm tra.

---

## 1. Nguyên tắc kiến trúc không thể thương lượng

- PostgreSQL: trạng thái nghiệp vụ, cấu hình, RBAC, checklist, findings, actions, approvals.
- ClickHouse: observations lịch sử, crawl facts, GSC/GA4/SERP/rank/backlink/performance series.
- S3-compatible: raw HTML, rendered HTML, screenshots, JSON nguồn, exports và report artifacts.
- Redis/BullMQ: queue/cache tạm thời; không phải nguồn sự thật.
- Go crawler/collector: fetch, render orchestration, SERP collection và network safety.
- NestJS/Fastify API: authorization, domain logic, orchestration và external API boundary.
- Next.js Web: agency/client UI.
- Next.js Admin: vận hành, quota, replay, cost, source health.
- FastAPI AI service: explain/classify/cluster/draft; không sở hữu metric hoặc quyết định policy.
- Mọi record scoped bằng `workspace_id` và `project_id` ở server.
- Mọi nguồn trả phí có quota, budget, rate limit, idempotency và kill switch.
- Mọi detector versioned; audit cũ giữ kết quả theo phiên bản cũ.
- Mọi metric hiển thị source, observed_at, ingested_at, freshness và classification.

---

## 2. Ranh giới năng lực và lựa chọn nguồn

### 2.1. Nguồn chính thức ưu tiên

| Integration | Dữ liệu | Giới hạn cần thể hiện |
|---|---|---|
| Search Console API | Search Analytics, Sitemaps, Sites, URL Inspection | Inspection API chỉ có indexed version, không live test |
| GA4 Data API | User/session/event/key event/revenue reports | Quota, threshold, scope và reporting identity |
| GBP APIs | Locations, reviews, posts, profile performance | Cần OAuth, verification và có thể cần cấp API quota |
| CrUX API/History API | Field CWV | Không phải URL nào cũng đủ sample |
| PageSpeed Insights API | Lighthouse lab diagnostics | Lab không thay thế field data |
| Schema.org/Google rules | Vocabulary và eligibility rules | Syntax hợp lệ không bảo đảm rich result |

### 2.2. Nguồn thương mại tùy chọn

| Capability | Option A | Option B | Fallback |
|---|---|---|---|
| SERP/rank | Collector/provider hiện có | Semrush/Ahrefs API | CSV import |
| Keyword volume/ideas | Semrush API | Ahrefs API | CSV/manual dataset |
| Backlinks | Ahrefs API | Semrush API | CSV import |
| Competitor visibility | Vendor API | Own tracked keyword set | Limited/manual |
| AI visibility | Vendor API | Versioned prompt monitor | Experimental |

Mọi vendor metric phải gắn `provider`, `database`, `country`, `device`, `collected_at`, `unit_cost` và `estimated=true`.

### 2.3. ADR bắt buộc trước khi triển khai

- ADR-SOURCE-001: lựa chọn SERP provider và pháp lý thu thập.
- ADR-SOURCE-002: lựa chọn backlink/keyword provider.
- ADR-RENDER-001: Playwright/Chromium rendering architecture.
- ADR-AI-001: model gateway, prompt/version/cost policy.
- ADR-CMS-001: connector SDK và write-back permission model.
- ADR-REPORT-001: PDF/HTML rendering stack.

---

## 3. Information Architecture của sản phẩm

### Global navigation

1. **Command Center**
2. **Project Setup**
3. **Audit & Standards**
4. **Technical SEO**
5. **Keyword & SERP**
6. **Content Center**
7. **Authority & Digital PR**
8. **Local / Ecommerce / International**
9. **Action Center**
10. **Measurement**
11. **Reports**
12. **Integrations & Settings**

### 3.1. Command Center

Widgets bắt buộc:

- Project health theo sáu gate, không dùng một “SEO score” mơ hồ.
- Critical/High findings mới và regression.
- Actions overdue/blocked/waiting approval/ready for QA.
- Source freshness và integration failures.
- Visibility, click, qualified traffic, conversion, revenue trend.
- Recent releases/content/offpage annotations.
- Cost/quota status cho crawl, SERP, AI và vendor APIs.
- Recommended next actions có evidence và confidence.

### 3.2. Project Setup

- Business profile và website type.
- Scope: domain/subdomain/folder/market/language/device/search engine.
- Objectives/KPIs/baselines/targets.
- Competitor sets theo loại.
- Team/RACI/SLA/cadence.
- Checklist applicability preview.
- Initial connection wizard.
- First-value progress: connect → crawl → baseline → findings.

### 3.3. Audit & Standards

- Standard version selector và changelog.
- Module tree và checklist progress.
- Control detail: source, method, result, evidence, exception, acceptance criteria.
- Audit runs và comparison.
- Coverage/applicability matrix.
- Manual verification queue.
- Finding validation/deduplication.
- Export audit evidence pack.

### 3.4. Technical SEO

- Crawl runs/config/schedule/progress.
- URL Explorer với raw/rendered/diff/screenshot/history.
- Indexability matrix.
- Robots/sitemap/canonical/status/hreflang/schema reports.
- Architecture/link graph/orphan/depth reports.
- JS rendering and parity.
- CWV field/lab by template.
- Release regression and site-change diff.
- Security/manual action connection status.

### 3.5. Keyword & SERP

- Query inventory và normalized keywords.
- Intent/cluster/entity/topic workspace.
- Keyword-to-URL map.
- Cannibalization/URL switching.
- Competitor and gap analysis.
- Rank history theo country/device.
- SERP snapshot/features/winners/losers.
- Tracking set/quota/schedule.
- Opportunity scoring editor.

### 3.6. Content Center

- Content inventory ghép crawl+GSC+GA4+keyword+backlink+conversion.
- Keep/Update/Merge/Redirect/Remove/Create decisions.
- Topic map/content calendar/roadmap.
- Brief builder with evidence.
- Draft/review/approval/version history.
- SEO/editorial/legal/accessibility checklists.
- CMS publish connector hoặc publish package.
- Post-publish monitoring và content decay.
- AI usage/provenance/cost log.

### 3.7. Authority & Digital PR

- Backlink/referring-domain inventory.
- Prospect database và Theme–Trust–Traffic review.
- Competitor link gap.
- Campaign/assets/outreach pipeline.
- Brand safety, paid/sponsored/UGC compliance.
- Placement QA và lost-link monitoring.
- Referral/brand/visibility/outcome measurement.

### 3.8. Specialized SEO

- Local: GBP locations, profile completeness, reviews, posts, local performance, store pages.
- Ecommerce: taxonomy, facets, products, variants, availability, schema, Merchant data, revenue.
- International: locale inventory, hreflang graph, market reports.
- Media/Publisher: images, videos, news sitemap, author/date/paywall.
- AI Visibility: experimental prompt sets, citations, referrals, confidence.

### 3.9. Action Center

- Unified inbox từ mọi module.
- Lifecycle: Proposed → Validated → Accepted/Rejected → Assigned → In progress → Ready for QA → Monitoring → Done.
- Finding/evidence/URL relationships.
- Owner/approver/priority/due date/dependency.
- Internal vs client-visible notes.
- Attachments, activity log, approval và risk acceptance.
- Bulk actions và saved views.
- Capacity/workload theo role và project.

### 3.10. Measurement & Reports

- KPI dictionary và source lineage.
- GSC/GA4/CRM/GBP/rank/backlink dashboards.
- Brand/non-brand, page type, market, device và cohort segmentation.
- Before/after windows, annotations và confounders.
- Control/matched cohort khi khả thi.
- Output/outcome/business impact separation.
- Confidence và data-quality panel.
- Client report builder, schedule, approval, secure link/PDF.

---

## 4. Unified data model

### 4.1. PostgreSQL domain tables

#### Tenancy và project

- `users`, `workspaces`, `workspace_members`, `projects`, `project_members`, `sites`.
- `project_scopes`, `project_markets`, `project_objectives`, `project_kpis`.
- `competitor_sets`, `competitors`, `project_assumptions`, `project_decisions`, `project_risks`.

#### Standards và audit

- `standard_versions(id, version, effective_at, status, source_manifest_hash)`.
- `standard_sources(id, name, url, authority_level, reviewed_at)`.
- `audit_modules(id, code, name, applicability_rule)`.
- `audit_controls(id, version_id, code, phase, evidence_level, method, pass_criteria, severity_rule)`.
- `control_sources(control_id, source_id, relationship)`.
- `audit_runs(id, project_id, standard_version_id, scope_snapshot, status)`.
- `audit_control_results(id, audit_run_id, control_id, result, exception, reviewer_id)`.
- `control_evidence(id, result_id, artifact_id, source_connection_id, observed_at)`.

#### Findings và actions

- `observations(id, source_type, source_ref, classification, observed_at)`.
- `findings(id, project_id, control_code, root_cause_key, normalized_scope_hash, severity, confidence)`.
- `finding_observations(finding_id, observation_id)`.
- `affected_entities(finding_id, entity_type, entity_id_or_url)`.
- `actions(id, project_id, title, status, priority, owner_id, approver_id, due_at)`.
- `action_findings(action_id, finding_id)`.
- `action_dependencies`, `action_comments`, `action_attachments`, `action_approvals`.
- `verification_records(id, action_id, verifier_id, result, criteria_snapshot, evidence)`.
- `measurement_reviews(id, action_id, window, baseline, result, confounders, confidence)`.

#### Integrations và operations

- `source_connections`, `oauth_credentials_encrypted`, `sync_states`, `sync_runs`.
- `job_runs`, `job_failures`, `dead_letter_jobs`, `ingestion_fences`.
- `artifacts`, `source_freshness`, `quota_usage`, `cost_ledger`, `kill_switches`.
- `audit_events`, `notifications`, `report_definitions`, `report_runs`.

#### Content và keyword

- `keywords`, `keyword_metrics`, `keyword_clusters`, `cluster_keywords`, `keyword_url_maps`.
- `serp_snapshots`, `rank_targets`, `rank_observations`, `serp_features`.
- `content_items`, `content_metrics`, `content_decisions`, `content_briefs`, `content_versions`, `content_reviews`.
- `campaigns`, `prospects`, `outreach_events`, `placements`, `backlink_observations`.
- `local_locations`, `local_reviews`, `local_performance`, `local_profile_snapshots`.

### 4.2. ClickHouse observations

- `crawl_url_observations`
- `crawl_link_observations`
- `render_observations`
- `gsc_search_analytics`
- `ga4_metrics`
- `serp_rank_observations`
- `backlink_observations`
- `crux_observations`
- `pagespeed_lab_observations`
- `gbp_performance_observations`
- `conversion_revenue_observations`

Mọi table có `workspace_id`, `project_id`, `source`, `observed_at`, `ingested_at`, `schema_version`, `ingestion_key`.

### 4.3. S3 artifact convention

```text
raw/{source}/{workspaceId}/{projectId}/{observedDate}/{ingestionKey}/...
derived/{detectorVersion}/{workspaceId}/{projectId}/{runId}/...
reports/{workspaceId}/{projectId}/{reportId}/{version}/...
evidence/{workspaceId}/{projectId}/{actionId}/{artifactId}/...
```

---

## 5. Detector và rules engine

### 5.1. Detector contract

```yaml
detector_id: canonical-target-invalid
version: 1.0.0
control_codes: [TECH-IDX-004]
inputs: [crawl_url_observations]
logic: deterministic expression
output_schema: finding-v1
severity_rule: impact x reach x confidence
exceptions: documented list
fixtures: positive/negative/missing/stale/boundary
owner: SEO Engineering
```

### 5.2. Loại detector

- Single URL deterministic.
- Cross-source reconciliation.
- Template/segment aggregation.
- Time-series anomaly.
- Manual verification required.
- Experimental/AI-assisted; không tự tạo FAIL nếu thiếu deterministic evidence.

### 5.3. Deduplication

Khóa gửi ý:

`workspace + project + control_code + root_cause_key + normalized_scope + active_detector_version`

Detector phát hiện nhiều URL cùng nguyên nhân tạo một finding có affected entity list, không tạo hàng nghìn task.

---

## 6. API surface nội bộ

### Standards/Audit

- `GET /standards/versions`
- `GET /projects/:id/checklist`
- `POST /projects/:id/audit-runs`
- `GET /audit-runs/:id/results`
- `POST /control-results/:id/manual-verification`
- `POST /findings/:id/validate`
- `POST /findings/merge`

### Crawl/URL

- `POST /sites/:id/crawls`
- `GET /crawls/:id`
- `POST /crawls/:id/cancel`
- `GET /urls/explorer`
- `GET /urls/:urlHash/history`
- `GET /urls/:urlHash/raw-rendered-diff`

### Keyword/Content/Authority

- `POST /keywords/import`
- `POST /keywords/research`
- `POST /keywords/cluster`
- `PUT /keyword-url-map`
- `GET /serp/snapshots`
- `POST /content/briefs`
- `POST /content/:id/reviews`
- `POST /campaigns`, `POST /prospects/import`, `POST /placements/:id/verify`

### Actions/Measurement

- `POST /actions/from-findings`
- `PATCH /actions/:id/status`
- `POST /actions/:id/approve`
- `POST /actions/:id/verify`
- `POST /actions/:id/measurement-reviews`
- `GET /projects/:id/kpis`
- `POST /reports`, `POST /reports/:id/run`

Mọi endpoint thực thi server-side tenant scope, RBAC, audit log và idempotency khi mutation có thể chạy lại.

---

## 7. Roles và quyền

| Role | Quyền chính |
|---|---|
| Workspace Owner | Billing, plan, security, all projects |
| Workspace Admin | Members, integrations, project creation, reports |
| SEO Manager | Strategy, standards, priorities, approvals, reports |
| SEO Project Lead | Project operation, actions, audit, client communication |
| Technical SEO | Crawl, findings, recommendations, QA |
| Content Lead | Roadmap, briefs, reviews, approvals |
| Content Executive | Draft/update tasks theo assignment |
| Offpage/PR | Campaign, prospects, placements |
| Analyst | Data sources, KPI, measurement, report |
| Account | Client-visible coordination và approval tracking |
| Client Approver | Client-visible data, approve/reject assigned items |
| Client Viewer | Read-only approved views/reports |
| Support/Ops | Impersonation bị cấm; scoped diagnostics qua audited support session |

---

## 8. Kế hoạch thực thi chi tiết

### EPIC P0-01 — Chuẩn hóa Source of Truth

- [x] Import `MASTER-SEO-OPERATING-STANDARD-2026.md` thành seed/version manifest.
- [x] Tạo schema `standard_versions`, `sources`, `modules`, `controls`, `control_sources`.
- [x] Tạo CLI validate unique Control ID, source URL, applicability và required metadata.
- [x] Snapshot control version vào mỗi audit run.
- [x] UI standards browser và changelog.
- [x] Test không cho sửa ngầm control đã được audit run sử dụng.
- **Acceptance:** tạo audit run mới từ một version; audit cũ không thay đổi khi version mới phát hành.

### EPIC P0-02 — Tenant/RBAC/Audit Log

- [x] Negative tests cho workspace/project/control/action/artifact IDs.
- [x] Server-side query scoping helpers bắt buộc.
- [x] Role matrix và project-level membership.
- [x] Internal/client visibility enforcement.
- [x] Audit log cho connection, approval, replay, export, delete và risk acceptance.
- [x] Support session có lý do, TTL và audit.
- **Acceptance:** cross-tenant access/replay/export bị chặn và cảnh báo.

### EPIC P0-03 — Unified Integration Control Plane

- [ ] Source catalog và connection wizard.
- [x] OAuth PKCE/state, encrypted refresh tokens, key rotation.
- [x] GSC property selector và permission validation.
- [ ] GA4 property/data-stream selector và metadata sync.
- [ ] GBP account/location selector.
- [ ] API key vault cho vendor sources.
- [ ] CSV import mapping/versioning cho fallback.
- [ ] Connection health, freshness, quota và reconnect/disconnect.
- [x] Raw-response S3 write trước normalization.
- **Acceptance:** user kết nối nguồn và thấy data/freshness/error mà không mở trang nguồn.

### EPIC P0-04 — Data Lineage và Quality

- [x] Shared source envelope: source, run, observed_at, ingested_at, schema version.
- [x] Raw/normalized/derived classification.
- [x] Idempotency fences và reprocessing.
- [x] Freshness SLO theo nguồn.
- [x] Quality rules: duplicate, null, range, completeness, schema drift.
- [x] UI data provenance drawer trên mọi metric/finding.
- [x] Stale/missing/estimated badges.
- **Acceptance:** mọi số liệu truy về raw artifact và normalization version.

### EPIC P0-05 — Crawl, Render và URL Explorer

- [x] Safe fetch chống SSRF/DNS rebinding/redirect/private IP.
- [x] Robots, rate, concurrency, size, depth và URL pattern controls.
- [x] Raw HTML, headers và redirect history.
- [ ] Chromium render queue, screenshot, DOM và network/console errors.
- [ ] Raw/rendered diff.
- [ ] Link graph, sitemap merge và URL inventory.
- [x] Crawl schedules, progress, cancel, retry, kill switch.
- [ ] URL Explorer history và compare runs.
- [ ] Cost/resource limits.
- **Acceptance:** agency xem URL evidence và lịch sử trong MAVRYKSEO.

### EPIC P0-06 — Standards Audit Engine

- [ ] Applicability engine theo website type/market/features.
- [ ] Audit run generator.
- [ ] Detector registry/versioning/fixtures.
- [ ] Cross-source detectors.
- [ ] Manual verification forms.
- [ ] Result state machine và reviewer workflow.
- [ ] Finding aggregation/deduplication.
- [ ] Coverage/progress/severity dashboards.
- [ ] Evidence pack export.
- **Acceptance:** checklist Core chạy end-to-end và tạo findings có evidence.

### EPIC P0-07 — Action Center

- [ ] Unified action schema và lifecycle.
- [ ] Convert/merge findings → action.
- [ ] Assignment, priority, due date, dependencies và recurrence.
- [ ] Comments, attachments, internal/client visibility.
- [ ] Approval/rejection/risk acceptance.
- [ ] QA/verification records và rollback note.
- [ ] Monitoring date và measurement review.
- [ ] Saved views, bulk actions, notifications và overdue alerts.
- [ ] Workload/capacity view.
- **Acceptance:** một finding đi từ detect đến Done và measurement không dùng tracker ngoài.

### EPIC P0-08 — Measurement Foundation

- [ ] KPI dictionary và project objectives.
- [ ] GSC Search Analytics ingestion theo date/query/page/country/device.
- [ ] GA4 Data API ingestion theo approved report definitions.
- [ ] CRM/backend import connector interface.
- [ ] Annotation timeline.
- [ ] Brand/non-brand rule engine.
- [ ] Baseline/target and data-quality UI.
- [ ] Before/after comparison service.
- **Acceptance:** dashboard nối visibility → qualified traffic → conversion/revenue với source rõ.

### EPIC P0-09 — Observability, Backup và Cost Safety

- [ ] Correlation ID API→queue→worker→collector→storage.
- [ ] OpenTelemetry, structured logs, metrics, error tracking.
- [x] DLQ, authorized replay và runbook.
- [ ] Cost ledger per workspace/project/source.
- [x] Budget threshold và hard stop.
- [ ] Postgres/ClickHouse/S3 backup và restore drill.
- [ ] Graceful shutdown, deploy smoke test và rollback.
- **Acceptance:** truy vết job, phục hồi backup và chặn vượt ngân sách.

### EPIC P1-01 — Keyword & SERP Intelligence

- [ ] Keyword source connectors/import.
- [ ] Normalization và brand rules.
- [ ] SERP/rank collection country/device.
- [ ] Intent/cluster workspace và AI-assisted review.
- [ ] Keyword-to-URL mapping.
- [ ] Cannibalization/URL switching detector.
- [ ] Competitor/gap reports.
- [ ] Opportunity score configuration.
- [ ] Rank history, feature distribution và share of visibility.
- **Acceptance:** research→map→track→action trong một UI.

### EPIC P1-02 — Content Center

- [ ] Unified content inventory.
- [ ] Content performance join.
- [ ] Keep/Update/Merge/Redirect/Remove/Create workflow.
- [ ] Topic map và calendar.
- [ ] Evidence-backed brief builder.
- [ ] Draft/version/review/approval.
- [ ] SEO/editorial/legal/accessibility checklists.
- [ ] AI gateway với prompt/model/cost/provenance.
- [ ] CMS connector SDK: read, preview, optional publish.
- [ ] Post-publish QA và decay monitoring.
- **Acceptance:** content từ opportunity đến measured outcome trong hệ thống.

### EPIC P1-03 — Authority & Digital PR

- [ ] Backlink provider abstraction.
- [ ] Referring-domain/backlink inventory và history.
- [ ] Prospect/campaign/outreach pipeline.
- [ ] Theme–Trust–Traffic scoring có fields và reviewer.
- [ ] Brand-safety and link-policy checks.
- [ ] Placement verification crawler.
- [ ] Lost-link and reclaim workflow.
- [ ] Campaign outcome dashboard.
- **Acceptance:** campaign có đầy đủ approval, placement evidence và outcome.

### EPIC P1-04 — Local SEO

- [ ] GBP OAuth/accounts/locations sync.
- [ ] Location/profile completeness và policy checklist.
- [ ] Reviews list/reply workflow với permissions.
- [ ] GBP performance ingestion.
- [ ] Store-page crawl/content/schema mapping.
- [ ] Local rank grid/provider abstraction.
- [ ] Calls/directions/website/local conversion reporting.
- **Acceptance:** agency quản lý location, review, page và performance trong một hub.

### EPIC P1-05 — Ecommerce & International

- [ ] Ecommerce template/facet/product/variant models.
- [ ] Merchant/feed import và page consistency detectors.
- [ ] Availability/price/schema checks.
- [ ] Ecommerce GA4 reports và revenue joins.
- [ ] Locale/market inventory.
- [ ] Hreflang graph và cluster validation.
- [ ] Market-specific rank/content reports.
- **Acceptance:** ecommerce/international controls tự áp dụng đúng project.

### EPIC P1-06 — Reports & Client Portal

- [ ] Report component library.
- [ ] Client-visible filtering.
- [ ] Narrative blocks with data citations.
- [ ] AI draft không được thay metric/evidence.
- [ ] Preview/approval/versioning.
- [ ] Secure link/PDF/email schedule.
- [ ] White label và accessibility.
- [ ] Report delivery/open audit.
- **Acceptance:** monthly report tạo từ nguồn hệ thống, không copy thủ công.

### EPIC P2-01 — CMS/CRM Connector Ecosystem

- [ ] Connector SDK contract.
- [ ] WordPress first-party connector.
- [ ] Shopify connector.
- [ ] Magento connector.
- [ ] Generic webhook/CSV/SFTP connector.
- [ ] Read vs write scopes và approval.
- [ ] Preview/diff/rollback cho publish.
- [ ] Connector certification tests.
- **Acceptance:** connector lỗi không ảnh hưởng nguồn khác; write-back luôn có approval/audit.

### EPIC P2-02 — Automation và AI Assistant

- [ ] Agent chỉ truy cập tools theo RBAC và project scope.
- [ ] Read-only mặc định; write cần approval.
- [ ] Suggested action phải có source/evidence/confidence.
- [ ] Prompt injection defense cho crawled content.
- [ ] Budget/quota/model routing.
- [ ] Evaluation fixtures và hallucination tests.
- [ ] Full action audit trail.
- **Acceptance:** AI không tạo metric/finding giả và không tự publish ngoài quyền.

---

## 9. Testing strategy

### Unit

- Detector rules, score formula, applicability, dedupe, permissions, normalization.

### Contract

- GSC/GA4/GBP/vendor responses với fixtures versioned.
- Connector schema drift và error classification.

### Integration

- OAuth lifecycle, raw→normalized→derived lineage.
- Queue retry/idempotency/DLQ.
- Postgres/ClickHouse/S3 consistency.

### Security

- Tenant ID spoofing, object ID enumeration, job replay, artifact access.
- SSRF, DNS rebinding, redirect, IPv4/IPv6 private ranges.
- OAuth state/PKCE/token encryption/log redaction.
- CSV formula injection, stored XSS, prompt injection.

### E2E

- Empty workspace → setup → connect → crawl → audit → action → QA → report.
- Client approval flow.
- Source revoked/stale/quota exceeded.
- Crawl cancelled/retried/replayed.
- Responsive breakpoints và accessibility.

### Data quality

- Duplicate ingestion, missing dates, timezone, currency, GA4 scope, GSC omissions.
- Reprocessing produces new derived version without deleting history.

---

## 10. Non-functional requirements

| NFR | Initial target |
|---|---|
| API availability | ≥99,5% monthly pilot |
| Sync API p95 | <1s excluding export/AI |
| Project dashboard | <2s p75 with cached aggregates |
| Audit list | Virtualized/paginated at 100k findings |
| Tenant isolation | 100% negative security suite pass |
| Crawl safety | 100% private/metadata endpoints blocked in CI |
| Source freshness | Every card shows actual timestamp/status |
| Cost safety | 100% paid calls pass quota/budget gate |
| Accessibility | WCAG 2.2 AA target for core flows |
| Recovery | RPO/RTO defined and restore drill passed before beta |

---

## 11. Release gates

### Internal Alpha

- P0-01 đến P0-07 hoàn thành.
- GSC + crawl + audit + action end-to-end.
- Tenant/security suite pass.
- Raw artifact lineage và replay verified.

### Agency Pilot

- P0-08/P0-09 và Keyword/Content MVP hoàn thành.
- 5–10 projects thật, nhiều website type.
- First value <15 phút nếu nguồn sẵn sàng.
- Không Critical data leakage/cost overrun.
- ≥80% findings P0/P1 có evidence đầy đủ.

### Commercial Beta

- Core modules, reports và client portal hoạt động.
- Backup/restore/rollback/on-call runbooks diễn tập.
- Plan/entitlement/quota động.
- Unit economics được phê duyệt.
- Legal/vendor/API terms review hoàn thành.

---

## 12. Các điểm cần sửa trong kế hoạch cũ

1. `PROJECT-EXECUTION-PLAN.md` cũ tập trung Site Audit/Rank/Action nhưng chưa có Standards Registry và applicability engine.
2. Chưa tách observation → finding → action → verification → measurement thành entity rõ.
3. Chưa mô tả Unified Integration Control Plane đủ để thay việc mở công cụ ngoài.
4. Content, Authority, Local, Ecommerce, International và Measurement chưa có đặc tả feature sâu.
5. Một số hạng mục đánh dấu Done dù dependency đang In progress hoặc checklist con chưa hoàn tất.
6. Metadata owner/next decision/risk/evidence chưa được áp dụng nhất quán cho mọi P0/P1.
7. Chưa có connector capability/limitation matrix và API quota/cost model.
8. Chưa có plan cho manual verification trong trường hợp API không hỗ trợ.
9. Chưa có standard version migration và audit reproducibility.
10. Release gates cần đo workflow hoàn chỉnh, không chỉ build/test package.

---

## 13. Quy tắc quản lý file và task từ nay

- File này là canonical **product/engineering plan**.
- `MASTER-SEO-OPERATING-STANDARD-2026.md` là canonical **business/control standard**.
- Không tạo checklist nghiệp vụ mới ngoài standard; thay đổi bằng version.
- Không tạo tracker riêng ngoài Action Center; GitHub issues/PR chỉ là implementation evidence.
- Mỗi epic khi bắt đầu phải thêm owner, next decision, dependency, risk, target và evidence.
- Trạng thái Done chỉ hợp lệ khi acceptance, security, test, observability, docs và rollback đã pass.

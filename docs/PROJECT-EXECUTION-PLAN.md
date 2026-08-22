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

### Phase 0 — Security Stabilization (Khóa rủi ro bảo mật P0)

**Mục tiêu:** Đảm bảo hệ thống có cơ chế Authentication, Auditing và Authorization đáng tin cậy, cô lập hoàn toàn đa thuê (multi-tenant) và dự án (cross-project).

- [ ] **P0-01: Thay thế phương thức Authentication**: Tái cấu trúc cơ chế phiên làm việc (AuthSession). Không cấp JWT trực tiếp chỉ bằng email. Thay thế bằng OIDC/OAuth, Passwords + MFA hoặc Magic link sử dụng một lần có chữ ký số. Cung cấp access token ngắn hạn, refresh token rotation và cơ chế thu hồi session (session revocation).
- [ ] **P0-02: Loại bỏ Auto-login test account**: Triệt tiêu hoàn toàn logic tự động đăng nhập tài khoản test (`test@mavryk.io`) trong frontend (Next.js) khi khởi động. Thiết lập Route Guard ở cả middleware và NestJS controllers.
- [ ] **P0-03: Project Guard dạng fail-closed**: Nâng cấp `ProjectGuard` phủ toàn bộ các routes liên quan đến tài nguyên dự án (site, recommendation, keyword, report...). Đảm bảo cơ chế từ chối mặc định (fail-closed) khi không phân giải được context `projectId`.
- [ ] **P0-04: Global Validation**: Enforce `ValidationPipe` toàn cục trong NestJS Fastify app. Dùng DTO schemas (class-validator/Zod) với whitelist và reject unknown properties trên mọi body request.
- [ ] **P0-05: CORS và CSP headers**: Thu hẹp CORS origin wildcards (`*`), cấu hình allowlist động theo môi trường. Thiết lập Security Headers và Content Security Policy (CSP).
- [x] **P0-06: Tenant Isolation Suite**: Xây dựng bộ test suite thử nghiệm xâm nhập chéo tenant/project (negative testing) để xác thực tính cô lập dữ liệu (đã hoàn thành một phần).
- [ ] **P0-07: Khai tử Mock/Fallback Evidence**: Khi thiếu dữ liệu crawler/GSC, hệ thống trả về kết quả `NEED_DATA`, nghiêm cấm tạo evidence hoặc findings giả.
- [ ] **P0-08: Secret & Session Management**: Luân chuyển key (key rotation), mã hóa AES-256-GCM cho credentials, không cho phép default secrets tại môi trường production.
- [ ] **P0-09: Full-stack Smoke Test**: Thiết lập E2E pipeline chạy thử nghiệm liên lạc từ API cho đến Worker, Crawler, database (PostgreSQL, ClickHouse), và S3 storage.
- [ ] **P0-10: Production Config Validation**: Bổ sung cơ chế validate fail-fast cấu hình môi trường ngay khi khởi động dịch vụ.

- **Acceptance Gate:** Không còn bất kỳ lỗ hổng bảo mật P0/Critical nào được báo cáo. 100% tenant/cross-project negative tests pass.

---

### Phase 1 — Audit Data Model (Thiết lập mô hình kiểm toán)

**Mục tiêu:** Chuyển đổi 296 tiêu chuẩn SEO từ Markdown thành mô hình dạng máy đọc được (machine-readable) để tích hợp sâu vào Database và Ingestion Pipelines.

- [ ] **P1-01: Machine-readable Control Registry**: Đồng bộ đầy đủ các siêu dữ liệu tiêu chuẩn (applicability, evidence levels, severity, source mappings, acceptance criteria) vào schema database, thay vì chỉ lưu trữ mã tiêu chí thô.
- [ ] **P1-02: Applicability Profiles**: Phân phối tiêu chuẩn phù hợp theo loại website (Ecommerce, Local, Publisher) và thị trường (Market/Language).
- [ ] **P1-03: Control-Executor-Evidence Map**: Thiết lập ánh xạ chính xác giữa từng tiêu chuẩn với executor tự động (detector job) hoặc form xác thực thủ công.
- [ ] **P1-04: Hợp nhất Auditing Entity DTOs**: Tách bạch rõ ràng cấu trúc dữ liệu của Finding (phát hiện), Evidence Artifact (bằng chứng), Root Cause (nguyên nhân gốc), Action (hành động khắc phục) và Verification (QA kiểm chứng).
- [ ] **P1-05: Evidence Viewer & Data Lineage**: Tích hợp giao diện hiển thị bằng chứng raw (raw HTML, console errors, screenshot) và trace ngược nguồn gốc (lineage) từ số liệu hiển thị về file log hoặc API response thô.
- [ ] **P1-06: Versioned Deterministic Rules**: Phiên bản hóa các luật tính toán (detector versioning) để đảm bảo kết quả kiểm toán lịch sử không bị ảnh hưởng khi phát hành version checker mới.
- [ ] **P1-07: Resumable Ingestion & Audit Job**: Xây dựng bộ BullMQ Orchestrator xử lý các jobs crawl và ingestion có khả năng resume, báo cáo sự cố và ghi nhận cost thực tế.
- [ ] **P1-08: Secure API Connectors**: Hoàn thiện cổng kết nối GSC OAuth, GA4 data analytics, PageSpeed Insights/CrUX, Web-performance và Google Business Profile API.
- [ ] **P1-09: Tái cơ cấu Frontend**: Chia nhỏ trang `page.tsx` khổng lồ thành cấu trúc thư mục dạng Module (overview, crawl, audits, findings, actions...), tích hợp typed API client tự động sinh từ Swagger/OpenAPI.
- [ ] **P1-10: E2E Integration Coverage**: Bổ sung integration test tích hợp ClickHouse và MinIO S3 thô cho các detector.
- [ ] **P1-11: Loại bỏ Hard Thresholds trong Detectors**: Điều chỉnh các quy tắc cứng nhắc (như giới hạn 60/160 ký tự cho title/meta) sang dạng cảnh báo (warning/opportunity) hoặc đo đạc qua pixel width thực tế.
- [ ] **P1-12: Pin Dependency & Docker Version**: Khóa cố định các tag version của Docker images và package dependency.

- **Acceptance Gate:** Chạy thành công chuỗi workflow hoàn chỉnh: Connect sources → Crawl/Ingest → Control execution → Evidence generated → Findings logged → Action created.

---

### Phase 2 — Technical SEO Audit MVP

**Mục tiêu:** Cung cấp giải pháp Technical Audit tự động hóa, chính xác, có bằng chứng đầy đủ so với SEO checklist.

- [ ] Thu thập dữ liệu kỹ thuật: redirect chains, sitemaps index, canonical clusters, robot directives.
- [ ] Chromium remote rendering queue: chụp ảnh màn hình DOM, log errors console, check parity so với raw HTML.
- [ ] Phát hiện tranh chấp canonical và parameter/facet URL.
- [ ] Tích hợp Core Web Vitals lab and field metrics.
- [ ] UI so sánh sự thay đổi code của site qua các lần chạy (Release regression and code diff).

- **Acceptance Gate:** Độ phủ Technical controls tự động đạt > 90% với fixtures test cụ thể.

---

### Phase 3 — Data, Measurement và Content

**Mục tiêu:** Đo lường traffic, ranking, doanh thu và vận hành bộ máy sản xuất bài viết (Content Operations).

- [ ] Đồng bộ GA4 transaction/events và mapping URL mục tiêu.
- [ ] Quản lý danh mục Keyword, SERP tracking theo country/device/intent và opportunity scoring.
- [ ] Intent/cluster workspace hỗ trợ lập cấu trúc từ khóa.
- [ ] Content Inventory hỗ trợ đưa ra quyết định Keep/Update/Redirect/Remove.
- [ ] Evidence-backed Brief Builder và AI gateway ghi nhận cost/usage thực tế.
- [ ] CMS connectors hỗ trợ xuất bản bản nháp.

- **Acceptance Gate:** Dashboard đo lường được visbility -> traffic -> conversions cùng annotation của releases.

---

### Phase 4 — Specialized SEO và Authority

**Mục tiêu:** Đóng gói các tính năng SEO chuyên sâu phục vụ doanh nghiệp local, sàn TMĐT và chiến dịch làm PR/Backlinks.

- [ ] **Local SEO Hub**: Đồng bộ và quản trị GBP, tự động hiển thị ranking grid theo kinh độ/vĩ độ.
- [ ] **Ecommerce SEO module**: Tự động rà soát product schema, variant availability, price, check merchant center feed.
- [ ] **International SEO**: Rà soát, xây dựng đồ thị hreflang cluster đa thị trường.
- [ ] **Authority & Outreach**: Rà soát backlink, kiểm định vị trí đặt link (placement verification crawler), đánh giá theme/trust/traffic của domain đối tác.

---

### Phase 5 — Agency Operations

**Mục tiêu:** Biến hệ thống thành hệ điều hành quản lý công việc và báo cáo khách hàng tự động của Agency.

- [ ] Client Portal hỗ trợ xem báo cáo, duyệt đề xuất thay đổi.
- [ ] Quản lý RACI/SLA và năng lực sản xuất của đội ngũ (Workload/capacity).
- [ ] Tạo báo cáo định kỳ tự động dạng kéo thả (white label).
- [ ] Tích hợp CMS write-back connectors (WordPress, Shopify) đi kèm cơ chế kiểm duyệt chặt chẽ.
- [ ] Kết nối các phần mềm quản trị ngoài (Jira, ClickUp, Asana).

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

- 100% Phase 0 (Security Stabilization - P0-01 đến P0-10) hoàn thành và được kiểm chứng.
- Luồng Google Search Console + Crawl + Audit + Action hoạt động thực tế (không dùng mock/fallback dummy data trong code path).
- Bộ suite Tenant / Project level isolation và Role matrix test pass 100% (không có fail-open).
- Core database migrations được áp dụng thành công.

### Agency Pilot

- Phase 1 (Audit Data Model - P1-01 đến P1-12) cùng các core modules cho Technical SEO, Google Search Console, Keyword / Content MVP hoàn thành.
- Đã chạy thử nghiệm trên ít nhất 5-10 dự án thực tế với nhiều loại website và ngôn ngữ.
- Đạt chỉ số First-Value-Time < 15 phút từ lúc kết nối nguồn dữ liệu đến lúc xuất kết quả findings/evidence.
- Zero Critical data leakage & zero cost overruns (kiểm soát chặt chẽ ngân sách/quota của third-party APIs).
- Trên 80% findings cấp P0/P1 trong quá trình Audit được liên kết đầy đủ và hiển thị minh bạch evidence (raw data / metrics raw).

### Commercial Beta

- Toàn bộ Core Modules hoạt động ổn định và tích hợp mượt mà ở giao diện Frontend/Admin (có Route và Features scoped riêng biệt).
- Đóng gói đầy đủ các Report component và Client Portal cho phép khách hàng trực tiếp xem, phản hồi và duyệt các Actions.
- Kịch bản Disaster Recovery (Backup/Restore/Rollback) đã được diễn tập thành công trên môi trường hạ tầng thật.
- Module quota, entitlement, rate limits, và billing plans hoạt động tin cậy.
- Kiểm duyệt pháp lý và điều khoản đối tác hoàn thành (Legal / API Vendor terms review).

---

## 12. Định nghĩa hoàn thành tính năng (DoD - Definition of Done)

Một tính năng hoặc epic của MavrykSEO chỉ được đánh giá là ĐÃ HOÀN THÀNH (Done) khi đáp ứng đầy đủ các tiêu chuẩn khắt khe sau:

1. **Về Security**:
   - Không chứa bất kỳ lỗ hổng bảo mật P0/Critical nào theo threat model.
   - Mọi API endpoint thay đổi dữ liệu (mutation) đều được bảo vệ bằng guards an toàn (Auth, Tenant, Project).
   - Rõ ràng trong việc phân quyền hiển thị client-facing (ví dụ: ẩn/mã hóa các trường nội bộ `internalNotes` đối với client/viewer).
2. **Về Code & Architecture**:
   - Toàn bộ codebase đạt chuẩn TypeScript strict mode.
   - Loại bỏ hoàn toàn mock data/evidence trong runtime path của môi trường production. Khi thiếu dữ liệu nguồn, bắt buộc báo trạng thái `NEED_DATA`.
   - Có error handling rõ ràng, không swallow exception và không duplicate logic nghiệp vụ.
3. **Về Testing & Quality**:
   - Tỷ lệ bao phủ kiểm thử đơn vị ổn định, có integration/E2E test suite đi kèm với các fixtures chuẩn (chặn các lỗi false positive do hard length limit).
   - Unit tests và build build-check của package/monorepo pass hoàn chỉnh.
4. **Về Observability**:
   - Mọi luồng xử lý nền (background jobs) hay API requests đều được gắn kết Correlation ID để trace-ability.
   - Ghi nhận nhật ký audit trail cụ thể cho các hành động nhạy cảm hoặc thay đổi trạng thái findings/actions/approvals.
5. **Về Governance & Documentation**:
   - Standard version được snapshot bất biến vào Audit Runs.
   - Mọi thay đổi dữ liệu / tích hợp đều có thông tin data provenance (freshness, metadata) rõ ràng.

---

## 13. Quy tắc quản lý file và kế hoạch thực thi (Rule of Engagement)

- Tài liệu `PROJECT-EXECUTION-PLAN.md` này là nguồn sự thật duy nhất (Canonical Product/Engineering Plan).
- Tài liệu `MASTER-SEO-OPERATING-STANDARD-2026.md` là nguồn sự thật nghiệp vụ (Canonical Control Standard).
- Mọi nghiệp vụ / tiêu chuẩn bắt buộc phải được định nghĩa trong Standard trước khi đưa vào code; thay đổi/nâng cấp tiêu chuẩn bằng cách phiên bản hóa (versioning).
- Không tạo tracker độc lập bên ngoài Action Center; các issues/PR chỉ dùng làm bằng chứng triển khai.
- Khi bắt đầu thực thi bất kỳ Epic/Phase nào, phải chuẩn bị đầy đủ Owner, Next Decisions, Dependencies, Risks, Targets và Evidence.

# MAVRYKSEO — BÁO CÁO ĐÁNH GIÁ DỰ ÁN HOÀN CHỈNH

> **Vai trò đánh giá:** Full-stack Technical Lead và Lead SEO  
> **Repository:** `hungnln2102/MavrykSeo`  
> **Artifact được rà soát:** `MavrykSeo-main.zip`  
> **Ngày đánh giá:** 2026-08-23  
> **Phiên bản báo cáo:** 1.0  
> **Loại đánh giá:** Static source-code review + architecture review + SEO operating-standard review

---

## 1. Executive Summary

MavrykSEO có định hướng đúng cho một **SEO Agency Operating System**: kiến trúc đa dịch vụ, lưu trữ dữ liệu theo mục đích, crawler riêng, pipeline job, GSC ingestion, detector, content workflow, audit standard có version và giao diện quản lý tập trung.

Tuy nhiên, trạng thái code hiện tại mới phù hợp với định nghĩa:

> **Alpha/prototype có nền tảng kiến trúc tốt, chưa đủ an toàn và đầy đủ để sử dụng như một nền tảng SEO Agency production.**

Dự án chưa đạt tuyên bố “Agency có thể kiểm tra toàn bộ một website mà không cần truy cập công cụ khác” vì ba khoảng cách chính:

1. **Security release blockers:** đăng nhập chỉ bằng email, frontend tự đăng nhập tài khoản test, CORS mở, validation runtime chưa đầy đủ và project authorization có nhánh fail-open.
2. **Khoảng cách giữa standard và execution:** tài liệu có 21 module/296 control, nhưng database/parser chỉ giữ một phần metadata và phần lớn control chưa có executor/evidence tự động.
3. **Khoảng cách giữa UI và sản phẩm thật:** frontend/admin còn nhiều localhost, mock data, fallback giả và một component lớn; chưa có đầy đủ connector/dataset cần thiết cho Agency.

### 1.1. Điểm tổng thể

| Hạng mục | Điểm | Trạng thái |
|---|---:|---|
| Kiến trúc hệ thống | 7.0/10 | Nền tảng tốt |
| Backend/API | 5.0/10 | Có nghiệp vụ thật nhưng còn lỗi biên và validation |
| Frontend | 3.5/10 | Prototype lớn, chưa production-ready |
| Data architecture | 6.0/10 | Đúng hướng, schema audit chưa đủ giàu |
| Security | 2.0/10 | Có release blocker nghiêm trọng |
| Testing và CI/CD | 4.5/10 | Có nền móng, thiếu integration/E2E đa dịch vụ |
| SEO standard — tài liệu | 7.0/10 | Độ phủ rộng, nguồn tốt |
| SEO automation thực tế | 3.0/10 | Tự động hóa một phần Technical/GSC/Keyword |
| Agency one-stop readiness | 3.0/10 | Chưa thay thế được hệ sinh thái công cụ ngoài |
| Production readiness | 2.5/10 | Chưa đủ điều kiện phát hành |

**Điểm tổng hợp đề xuất: 4.5/10.**

### 1.2. Quyết định phát hành

| Môi trường | Đánh giá |
|---|---|
| Local demo | Có thể tiếp tục sử dụng |
| Internal alpha | Có thể, nếu cô lập và không dùng dữ liệu thật |
| Pilot với khách hàng | Chưa nên |
| Public beta | Không đạt |
| Production/Commercial SaaS | Không đạt |

---

## 2. Phạm vi và phương pháp đánh giá

### 2.1. Phạm vi đã rà soát

- Cấu trúc monorepo và tài liệu kiến trúc.
- Next.js Web và Admin.
- NestJS API.
- NestJS/BullMQ Worker.
- Go crawler và SERP collector.
- Python/FastAPI AI service.
- PostgreSQL/Drizzle schema và migrations.
- ClickHouse abstraction.
- Redis/BullMQ job flow.
- MinIO/S3 raw-artifact flow.
- Authentication, tenant scope, project scope và role guard.
- GSC OAuth/integration.
- Audit standard, standard seeding, audit run và result flow.
- Detector và recommendation pipeline.
- Docker Compose, CI, observability và security scan.
- Bộ `MASTER SEO OPERATING STANDARD 2026`.

### 2.2. Kiểm tra đã thực hiện

- Kiểm kê an toàn nội dung ZIP trước khi giải nén.
- Đọc source và tài liệu theo module.
- Kiểm tra controller/guard/service và dữ liệu xuyên tenant/project.
- Kiểm tra rule detector và so sánh với nguyên tắc trong SEO standard.
- Kiểm tra số lượng control/source và duplicate ID.
- Compile cú pháp Python AI service.
- Đối chiếu mẫu nguồn chính thức với Google Search Central, RFC 9309 và WCAG 2.2.

### 2.3. Kết quả kiểm tra định lượng

| Kiểm tra | Kết quả |
|---|---:|
| SEO modules trong standard | 21 |
| Checklist controls | 296 |
| Control ID duy nhất | 296 |
| Duplicate control ID | 0 |
| Nguồn trong source catalog | 27 |
| Source ID duy nhất | 27 |
| TypeScript source files | 121 |
| TypeScript test files | 24 |
| Go test files | 1 |
| Python test files | 0 |
| Detector được đăng ký trong worker | 13 |
| Python syntax compile | Pass |

### 2.4. Giới hạn đánh giá

Đây chưa phải chứng nhận vận hành end-to-end. Gói ZIP không kèm dependencies đã cài đặt; package manager yêu cầu truy cập registry nhưng môi trường rà soát không cho phép. Go runtime cũng không có sẵn. Vì vậy:

- Chưa xác nhận toàn bộ `lint`, `typecheck`, unit test và build.
- Chưa chạy Docker Compose full stack.
- Chưa benchmark crawler/worker/database.
- Chưa thực hiện dynamic penetration test.
- Chưa thực hiện crawl thực tế trên website lớn.
- Chưa xác nhận lịch sử commit/review vì artifact là ZIP, không phải clone có Git history đầy đủ.

Mọi nhận định trong báo cáo được phân loại dựa trên code/tài liệu quan sát được; không coi sự tồn tại của file test hoặc CI config là bằng chứng rằng pipeline đang pass.

---

## 3. Kiến trúc hệ thống

### 3.1. Cấu trúc chính

| Thành phần | Công nghệ | Vai trò |
|---|---|---|
| Web | Next.js | Workspace/project UI và feature hub |
| Admin | Next.js | Quản trị hệ thống/tenant |
| API | NestJS + Fastify | Nghiệp vụ, auth, tenant, integration, audit |
| Worker | NestJS + BullMQ | Crawl ingestion, GSC, SERP và detector |
| Crawler | Go | Crawl URL/sitemap, parse HTML, SSRF protection |
| Collector | Go | Thu thập SERP/rank observation |
| AI | FastAPI/Python | Recommendation, intent, clustering, content brief |
| PostgreSQL | Drizzle ORM | Business state và audit workflow |
| ClickHouse | ClickHouse client | Observation/time-series SEO data |
| Redis | Redis/BullMQ | Queue và ephemeral coordination |
| S3/MinIO | AWS SDK | Raw HTML/raw artifact |

### 3.2. Điểm kiến trúc tốt

1. Phân tách business state và observation data đúng hướng.
2. Raw artifact được đưa sang object storage thay vì nhồi vào PostgreSQL.
3. Crawler/collector Go phù hợp với workload network-bound và concurrency.
4. AI được tách thành service riêng, không trộn trực tiếp vào deterministic detector.
5. Có correlation/idempotency concept trong job contract.
6. Có audit log, metrics, tracing và Sentry hooks.
7. Có workspace, project và project membership — phù hợp mô hình Agency nhiều khách hàng.

### 3.3. Rủi ro kiến trúc

- Service contract chưa được kiểm chứng bằng contract/integration test đầy đủ.
- Nhiều dependency/service endpoint dùng default localhost.
- AI service không thể hiện lớp xác thực nội bộ.
- Một số fallback mock nằm trong runtime path, có nguy cơ làm sai dữ liệu production.
- Docker images dùng tag `latest`, làm build không tái lập.
- Không thấy deployment manifest production hoàn chỉnh với network policy, secret manager, autoscaling và backup/restore test.

---

## 4. Đánh giá bảo mật

## 4.1. P0 — Đăng nhập chỉ cần biết email

`AuthService.login(email)` tìm user bằng email và cấp JWT trực tiếp. Không có:

- Password verification.
- Magic-link challenge đã ký.
- OTP.
- OAuth/OIDC callback được xác minh.
- Email ownership proof.
- MFA.

### Tác động

Kẻ tấn công biết email của user có thể lấy JWT của user đó. Nếu email thuộc owner/admin, toàn bộ workspace, integration token và dữ liệu dự án có thể bị truy cập.

### Yêu cầu sửa

- Thay auth implementation bằng OIDC/OAuth, password+MFA hoặc magic link dùng một lần.
- Không cấp JWT nếu chưa có proof-of-possession.
- Access token ngắn hạn.
- Refresh-token rotation và reuse detection.
- Token/session revocation.
- Email verification.
- Login audit và anomaly/risk signal.
- Rate limit theo IP, account và device fingerprint phù hợp.

## 4.2. P0 — Frontend tự đăng nhập test account

Web gọi trực tiếp `POST http://localhost:3000/auth/login` với `test@mavryk.io` trong `useEffect` khi mở trang.

### Tác động

- Không tồn tại user authentication UX thực.
- Có thể vô tình phát hành demo identity ra production.
- Test account trở thành shared principal, làm audit log không đáng tin.

### Yêu cầu sửa

- Xóa auto-login khỏi production bundle.
- Tạo login/session route đúng nghĩa.
- Route guard ở server/middleware.
- Không lưu access token tùy tiện trong global browser state.

## 4.3. P0 — ProjectGuard fail-open

Guard tự suy luận `projectId` từ param/body/query/header và chuỗi URL. Khi không tìm được project context, guard trả về `true`.

### Tác động

Route mới hoặc route đặt tên không khớp heuristic có thể bỏ qua project authorization.

### Yêu cầu sửa

- Project-scoped route phải fail-closed.
- Dùng decorator khai báo resolver rõ ràng cho từng loại resource.
- Service/query vẫn phải scope theo workspace/project, không chỉ dựa vào guard.
- Viết negative tests cho cross-project/cross-tenant access.

## 4.4. P0 — CORS mở toàn bộ origin

API đang dùng `origin: '*'` trong khi xử lý dữ liệu Agency và integration credential.

### Yêu cầu sửa

- Allowlist origin theo môi trường.
- Security headers và CSP.
- CSRF strategy phù hợp với cookie/token model.
- Không expose internal API trực tiếp nếu chỉ worker/service cần gọi.

## 4.5. P0/P1 — Runtime validation chưa hoàn chỉnh

Nhiều controller dùng anonymous TypeScript body type. Không thấy global `ValidationPipe` với whitelist/forbid unknown/transform và DTO schema đầy đủ.

### Ví dụ rủi ro

- Audit result nhận arbitrary string.
- Integration status/provider nhận arbitrary string.
- Scope snapshot nhận `any`.
- Request body có thể chứa field không mong muốn hoặc payload quá lớn.

### Yêu cầu sửa

- DTO dùng class-validator/Zod/JSON Schema.
- Whitelist và reject unknown fields.
- Enum tại application và database.
- Body-size limit theo endpoint.
- Sanitize/normalize URL, email và identifier.

## 4.6. Điểm bảo mật tốt

- JWT secret bắt buộc trong production.
- Encryption key bắt buộc trong production.
- Integration credentials được mã hóa AES-256-GCM.
- Crawler có SSRF/IP protection, redirect protection và response-size limit.
- Có rate-limit/throttling foundation.
- Có CI gitleaks và Trivy.
- Workspace membership và project membership đã được mô hình hóa.

Các điểm trên có giá trị nhưng không bù được lỗi auth P0.

---

## 5. Backend và API

### 5.1. Điểm tốt

- Module separation tương đối rõ: auth, workspaces, projects, sites, keywords, content, reports, integrations, standards và audits.
- Service thường xác minh project thuộc workspace trước khi thao tác.
- Có roles như owner/admin/manager/seo/content/client/viewer.
- Có audit-log interceptor/decorator.
- Có idempotency/fence concept ở job ingestion.
- Credentials không được trả trực tiếp trong integration response thông thường.

### 5.2. Vấn đề cần xử lý

1. Guard dựa trên URL substring quá giòn.
2. Authorization phân tán giữa guard và service, chưa có policy thống nhất.
3. Role/status lưu dạng text ở nhiều bảng, thiếu enum/check constraint.
4. Error handling và error contract chưa thống nhất.
5. Không thấy OpenAPI-generated client được sử dụng ở frontend.
6. Không có API versioning rõ ràng.
7. Internal AI/crawler service authentication chưa hoàn thiện.
8. Support session grant admin cần quy trình tạo/phê duyệt/revoke/audit cực chặt.
9. Một số endpoint global standard dùng RolesGuard nhưng không có TenantGuard để resolve role, khiến behavior có thể không đúng thiết kế.

---

## 6. Data Architecture và schema

### 6.1. Điểm tốt

- PostgreSQL giữ workspace/project/membership/action/audit state.
- ClickHouse dành cho crawl/rank/GSC observation.
- S3 giữ raw evidence.
- Redis không được dùng làm source of truth lâu dài.
- Standard version và audit run đã có quan hệ.
- Có source manifest hash.

### 6.2. Vấn đề schema

#### A. Unknown bị trộn với zero

`searchVolume` và `difficulty` mặc định `0` có thể làm mất phân biệt:

- Không có dữ liệu.
- Dữ liệu đo được bằng 0.
- Dữ liệu ước tính bằng 0.

Nên dùng nullable value kèm:

- Provenance.
- Provider.
- Observed/estimated/derived.
- CollectedAt.
- Confidence.
- Market/device/language.

#### B. Word count mặc định 1.000

`targetWordCount` mặc định 1.000 là heuristic SEO không có tính phổ quát. Word count phải dựa trên intent, content type, information gain và SERP/context, không phải ngưỡng mặc định coi như chuẩn.

#### C. Audit control schema thiếu metadata

Schema/parser hiện chủ yếu giữ:

- Version.
- Module.
- Control code.
- Phase.
- Description.

Trong khi standard yêu cầu thêm:

- Applicability.
- Evidence level.
- Source IDs.
- Method.
- Scope.
- Evidence requirements.
- Severity logic.
- Acceptance criteria.
- QA evidence.
- Measurement window.

Đây là nguyên nhân chính khiến checklist chưa trở thành audit engine.

#### D. Audit result thiếu evidence model giàu

Cần model hóa riêng:

- Finding.
- Evidence artifact.
- Evidence observation.
- Root cause.
- Action.
- Verification.
- Accepted risk.
- Approval.
- Incident/regression.

Không nên gộp tất cả vào result/status/exception string.

---

## 7. Frontend và Admin

### 7.1. Hiện trạng Web

Web có giao diện khá rộng và thể hiện nhiều ý tưởng sản phẩm, nhưng phần lớn nằm trong một file `apps/web/src/app/page.tsx` hơn 5.000 dòng.

Các vấn đề chính:

- Auto-login test account.
- API URL hard-code `http://localhost:3000`.
- Nhiều state `any`.
- Không có typed API client.
- Không có query-cache layer rõ ràng.
- Mock metrics, keyword, site và recommendation fallback.
- Feature/state/UI/network logic trộn trong một component.
- Chưa có route separation theo module.
- Khó kiểm tra accessibility, error boundary và permissions.

### 7.2. Hiện trạng Admin

Admin dashboard chủ yếu là mock data cho:

- Workspace.
- Plan.
- System health.
- Quota.
- SSO session.

Text “Secured by Cloudflare Access SSO” trong giao diện không phải bằng chứng SSO thực sự đã được enforce.

### 7.3. Kiến trúc frontend đề xuất

```text
apps/web/src/
├── app/
│   ├── (auth)/
│   ├── (workspace)/[workspaceId]/
│   │   └── projects/[projectId]/
│   │       ├── overview/
│   │       ├── crawl/
│   │       ├── standards/
│   │       ├── audits/
│   │       ├── findings/
│   │       ├── actions/
│   │       ├── keywords/
│   │       ├── content/
│   │       ├── authority/
│   │       ├── local/
│   │       ├── ecommerce/
│   │       └── reports/
├── features/
├── components/
├── api/
├── schemas/
├── permissions/
└── telemetry/
```

Mỗi feature cần có page, API client, schema, permission boundary, error/loading/empty state và test riêng.

---

## 8. Crawler, Worker và detector

### 8.1. Năng lực crawler quan sát được

- HTTP fetch.
- Redirect chain/status.
- Robots.txt.
- Sitemap và sitemap index.
- Title.
- Meta description.
- Meta robots.
- Canonical.
- Heading H1–H6.
- SSRF protection.
- Size/time limits.

### 8.2. Detector hiện có

1. Content decay.
2. CTR opportunity.
3. Striking distance.
4. Cannibalization.
5. Orphan page.
6. Title/meta issue.
7. Redirect issue.
8. Canonical issue.
9. Indexability issue.
10. Internal-link opportunity.
11. Competitor gain.
12. Lost ranking.
13. Winning page.

### 8.3. Rule gây false positive hoặc sai triết lý standard

#### Title/meta character limits

Detector đang coi các ngưỡng 30/60 cho title và 70/160 cho description là issue cứng. Chính standard lại quy định không dùng độ dài ký tự làm policy cứng.

Giải pháp:

- Đổi thành warning/opportunity.
- Kết hợp rendered pixel width.
- Phân loại theo device/language/template.
- Đối chiếu SERP rewrite khi có dữ liệu.
- Không dùng làm gate “SEO Pass”.

#### Missing canonical

Không phải mọi URL thiếu self-canonical đều là lỗi. Cần xét:

- Duplicate cluster.
- Parameter/facet.
- Indexability.
- Redirect.
- Sitemap/internal-link signals.
- Google-selected canonical từ GSC khi có.

#### Orphan fallback giả

Khi không lấy được HTML từ S3, orphan detector có fallback tạo link giả. Dữ liệu thiếu phải cho kết quả `NEED_DATA`, không được tạo evidence giả hoặc finding giả.

#### Regex HTML parsing ở worker

Một phần metadata được parse bằng regex. Cách này dễ sai khi:

- Thuộc tính đổi thứ tự/phức tạp.
- HTML malformed.
- JavaScript rendering.
- Multiple conflicting tags.
- Encoding/namespace khác nhau.

Crawler nên trả structured extraction làm source chính; worker không nên parse lại raw HTML theo regex đơn giản.

---

## 9. AI service

### 9.1. Điểm tốt

- AI tách khỏi deterministic detector.
- Hỗ trợ nhiều provider và custom endpoint.
- Pydantic giới hạn một phần output score.
- Có timeout cho provider call.
- Có local fallback để demo.

### 9.2. Rủi ro

- Không có Python test.
- Requirements chưa khóa version/digest.
- Internal endpoint chưa thấy authentication.
- Provider failure tự fallback có thể làm user không biết output là mock/local.
- Output chưa có provenance/confidence/model/prompt version rõ ràng trong database.
- Chi phí token chỉ được ước lượng theo độ dài chuỗi, không phải usage trả về từ provider.
- AI recommendation có thể được lưu như action thật dù chất lượng/chứng cứ chưa được duyệt.

### 9.3. Yêu cầu AI governance

Mỗi AI output cần lưu:

- Provider/model/version.
- Prompt template version.
- Input artifact IDs.
- Timestamp.
- Token usage và cost thực tế.
- Fallback mode.
- Confidence.
- Human approval status.
- Data-retention/redaction policy.

AI không được tự quyết định PASS/FAIL cho control cấp A nếu có deterministic method chính thức.

---

## 10. CI/CD, testing và vận hành

### 10.1. Điểm tốt

- Frozen dependency install trong CI.
- Migration/seed idempotency intent.
- Lint/typecheck/test/build stages.
- Playwright responsive test.
- Gitleaks.
- Trivy vulnerability/config scan.
- Prometheus/Grafana/OTel/Sentry foundation.

### 10.2. Khoảng trống

- CI chưa thể hiện Go test.
- Không có Python test.
- Thiếu ClickHouse integration test.
- Thiếu Redis/BullMQ E2E.
- Thiếu MinIO raw-artifact E2E.
- Thiếu API ↔ worker ↔ crawler ↔ AI contract test.
- Thiếu tenant isolation adversarial suite.
- Thiếu load/crawl benchmark.
- Thiếu backup/restore drill.
- Thiếu production deployment smoke/canary/rollback evidence.
- Nhiều container dùng `latest`.

### 10.3. Test gates tối thiểu trước beta

1. Unit tests cho mọi guard, service và detector.
2. Contract tests cho mọi job schema/API service call.
3. Integration tests dùng PostgreSQL, ClickHouse, Redis và MinIO thật.
4. Cross-tenant/cross-project negative tests.
5. Crawl fixtures cho redirect, robots, canonical, hreflang, JS và malformed HTML.
6. Audit-run-to-finding-to-action-to-QA E2E.
7. GSC token refresh/revoke/failure tests.
8. Load test và resource quota test.
9. Security test cho auth/session/SSRF/CORS/input validation.
10. Disaster recovery test.

---

## 11. Đánh giá bộ SEO Operating Standard

### 11.1. Nguồn xây dựng

Standard viện dẫn các nhóm nguồn phù hợp:

- Google Search Essentials/Starter Guide/Search Works/Spam Policies.
- Google crawl/index/canonical/JavaScript/mobile/structured data/ecommerce.
- Google Search Console và GA4 API.
- Chrome/web.dev Core Web Vitals và PageSpeed Insights.
- Schema.org.
- Google Business Profile.
- RFC 9309.
- WCAG 2.2.
- Screaming Frog, Semrush và Ahrefs cho workflow/tool coverage.

Không có một checklist SEO duy nhất được Google hoặc toàn ngành chứng nhận cho mọi website. Vì vậy cách kết hợp nguồn chính thức, nguồn công cụ phổ biến và nghiệp vụ Agency là hợp lý, với điều kiện từng control phải có source/evidence/applicability cụ thể.

### 11.2. Điểm mạnh

- Không chỉ giới hạn ở Technical SEO.
- Có governance, data, QA, measurement và migration.
- Có specialized module cho Local, Ecommerce, International và Publisher.
- Có chống SEO myth.
- Phân biệt observed, derived, estimated và AI.
- Có `NOT_APPLICABLE`, `NEED_DATA`, `ACCEPTED_RISK`.
- Definition of Done không tuyên bố website “chuẩn SEO” chỉ vì technical pass.

### 11.3. Điểm chưa hoàn chỉnh

Danh sách 296 dòng trong Markdown mới chủ yếu là mô tả ngắn. Metadata mẫu được tuyên bố ở đầu tài liệu nhưng chưa được khai báo đầy đủ cho từng control.

Để trở thành standard có thể kiểm chứng, mỗi control cần một hồ sơ machine-readable, ví dụ:

```yaml
control_id: TECH-IDX-001
version: 1.0
module: technical
phase: assess
applicability: [core]
evidence_level: A
source_ids: [SRC-GCANON]
executor_type: automated
method_version: canonical-cluster-v1
inputs:
  - crawl_observation
  - sitemap_observation
  - gsc_indexing_observation
result_enum:
  - PASS
  - FAIL
  - WARNING
  - NOT_APPLICABLE
  - NEED_DATA
severity_rules: []
acceptance_criteria: "..."
evidence_requirements: []
false_positive_notes: "..."
qa_method: "..."
```

### 11.4. Kết luận về checklist

| Câu hỏi | Kết luận |
|---|---|
| Có phải checklist chỉ Technical SEO? | Không; có 21 module toàn vòng đời |
| Nguồn có đáng tin không? | Nền nguồn nhìn chung tốt |
| 296 ID có bị trùng không? | Không |
| Có bảo đảm website ranking không? | Không checklist nào có thể bảo đảm |
| Pass hết có nghĩa website hoàn hảo? | Không; chỉ có nghĩa đã đạt standard/version/scope/evidence cụ thể |
| Checklist đã tích hợp vào sản phẩm chưa? | Mới tích hợp registry/manual audit một phần |
| 296 control đã tự động hóa chưa? | Chưa |

---

## 12. Độ phủ 21 module trong sản phẩm

| # | Module | Standard | Tự động hóa hiện tại | Gap chính |
|---:|---|---:|---:|---|
| 1 | Strategy & Governance | Có | Rất thấp | Brief, RACI, SLA, risk/decision register |
| 2 | Data & Tracking | Có | Thấp | GA4, consent, attribution, lineage UI |
| 3 | Market & Competitor | Có | Thấp | Market model và competitor evidence |
| 4 | Keyword & SERP | Có | Trung bình | Provider reliability, market/device/local |
| 5 | Technical SEO | Có | Trung bình | JS rendering, CWV, logs, schema/hreflang depth |
| 6 | Information Architecture | Có | Thấp | Taxonomy/graph/template analysis |
| 7 | On-page SEO | Có | Thấp | Intent/entity/media/accessibility evidence |
| 8 | Content Operations | Có | Thấp–TB | Editorial workflow, approval, real publishing |
| 9 | Entity, Brand & Trust | Có | Gần như chưa | Entity/brand/source/trust evidence |
| 10 | Off-page & Digital PR | Có | Chưa | Backlink index, outreach, brand safety |
| 11 | Local SEO | Có | Chưa | GBP, locations, reviews, local landing pages |
| 12 | Ecommerce SEO | Có | Chưa | Merchant/feed/facet/product lifecycle |
| 13 | International SEO | Có | Rất thấp | Hreflang cluster/market workflow |
| 14 | Image/Video/News | Có | Chưa | Media metadata/index/performance |
| 15 | AI Search Visibility | Có | Chưa đáng kể | Citation/mention tracking và methodology |
| 16 | CRO & Business Outcomes | Có | Chưa | GA4/conversion/revenue/incrementality |
| 17 | Action Center | Có | Thấp–TB | Acceptance, QA, dependencies, SLA |
| 18 | QA & Regression | Có | Thấp | Release gates và automated regression |
| 19 | Monitoring & Incident | Có | Thấp | SEO alert/incident/update timeline |
| 20 | Reporting & Improvement | Có | Thấp | Business reporting và causal confidence |
| 21 | Migration/Redesign | Có | Chưa | Inventory, mapping, validation, monitoring |

### Kết luận

Standard có độ phủ rộng nhưng product coverage thấp hơn đáng kể. Không được dùng số lượng 296 control để truyền thông rằng hệ thống đã có 296 automated checks.

---

## 13. Agency One-stop Gap Analysis

Để Agency không phải truy cập nhiều website khác, MavrykSEO cần hai chiến lược song song:

1. **Native engine:** những kiểm tra có thể tự crawl/tính toán đáng tin cậy.
2. **Integrated evidence:** nhập dữ liệu từ nguồn có thẩm quyền qua API, không ép Agency mở từng công cụ ngoài.

### 13.1. Connector/dataset cần bổ sung

| Nguồn/năng lực | Trạng thái | Mục đích |
|---|---|---|
| Google Search Console | Có một phần | Query/page/index/search performance |
| GA4 | Chưa đầy đủ | Conversion, transaction, revenue |
| CrUX/PageSpeed Insights | Chưa | Field/lab performance |
| Google Business Profile | Chưa | Local/store/review/profile |
| Merchant Center/product feed | Chưa | Ecommerce product visibility |
| Backlink dataset | Chưa | Authority/link audit/digital PR |
| Production SERP provider | Chưa xác nhận | Rank/features/local/device tracking |
| Log file ingestion | Chưa | Searchbot crawl behavior |
| Schema validator | Chưa đầy đủ | Structured-data eligibility/errors |
| CMS connectors | Chưa | Draft/publish/update workflow |
| Task/collaboration connectors | Chưa | Jira/ClickUp/Asana/Slack workflow |

### 13.2. Nguyên tắc one-stop đúng

“One-stop” không có nghĩa tự phát minh dữ liệu thay cho Google/GA4/backlink provider. Nó có nghĩa:

- Kết nối nguồn một lần.
- Đồng bộ và lưu provenance.
- Hiển thị evidence trong một giao diện.
- Chạy control trên dữ liệu đó.
- Tạo finding/action/QA trong cùng workflow.
- Chỉ mở deep link ngoài khi người dùng cần xử lý ở hệ thống nguồn.

---

## 14. Mô hình audit engine đề xuất

### 14.1. Chuỗi nghiệp vụ chuẩn

```text
Standard Version
  → Applicability Profile
  → Audit Scope
  → Data Readiness
  → Control Execution
  → Evidence
  → Result
  → Finding
  → Root Cause
  → Action
  → Implementation Evidence
  → QA Verification
  → Monitoring
  → Outcome Review
```

### 14.2. Phân loại executor

| Loại | Ví dụ |
|---|---|
| Automated | Status code, canonical cluster, sitemap consistency |
| API-assisted | GSC indexing, GA4 conversion, CrUX field data |
| Human verification | Brand positioning, content usefulness |
| Client evidence required | Business goal, margin, legal approval |
| Unsupported | Chưa có engine/connector; không được giả lập |

### 14.3. Result rules

- `PASS`: Đủ input và đạt acceptance criteria.
- `FAIL`: Đủ input và vi phạm điều kiện fail có căn cứ.
- `WARNING`: Cần xem xét theo ngữ cảnh, không phải lỗi cứng.
- `NEED_DATA`: Thiếu hoặc stale input.
- `NOT_APPLICABLE`: Không thuộc scope, có lý do.
- `ACCEPTED_RISK`: Có finding nhưng được người có thẩm quyền chấp nhận tạm thời.

### 14.4. Không được phép

- Chuyển dữ liệu thiếu thành PASS.
- Dùng mock/fallback làm evidence production.
- Gán FAIL bằng rule heuristic không có source/context.
- Cho AI tự tạo observed fact.
- Tự động close finding khi chưa có QA evidence.
- Sửa standard version đã dùng trong historical audit.

---

## 15. Backlog ưu tiên

## 15.1. P0 — Release blockers

| ID | Hạng mục | Acceptance criteria |
|---|---|---|
| P0-01 | Thay authentication | Không thể lấy session chỉ bằng email |
| P0-02 | Xóa test auto-login | Production bundle không chứa shared test identity |
| P0-03 | Project guard fail-closed | Route project-scoped không resolver phải từ chối |
| P0-04 | Global validation | DTO whitelist, enum, size limit, invalid input tests |
| P0-05 | CORS/security headers | Allowlist theo environment, CSP phù hợp |
| P0-06 | Tenant isolation suite | Cross-tenant/project negative tests pass |
| P0-07 | Loại mock evidence | Dữ liệu thiếu trả `NEED_DATA` |
| P0-08 | Secret/session controls | Rotation, revoke, no default production secret |
| P0-09 | Full-stack smoke test | API/worker/crawler/AI/data stores pass |
| P0-10 | Production config validation | Fail-fast nếu thiếu required config |

## 15.2. P1 — Audit engine và beta readiness

| ID | Hạng mục |
|---|---|
| P1-01 | Machine-readable control definition đầy đủ |
| P1-02 | Applicability profile theo website type/market |
| P1-03 | Control–executor–evidence mapping |
| P1-04 | Finding/root-cause/action/verification schema |
| P1-05 | Evidence artifact viewer và lineage |
| P1-06 | Versioned deterministic rules |
| P1-07 | Audit orchestrator và resumable jobs |
| P1-08 | GA4, PSI/CrUX và structured-data connector |
| P1-09 | Modular frontend và typed API client |
| P1-10 | Integration/E2E/contract test coverage |
| P1-11 | Remove hard thresholds hoặc hạ thành warning |
| P1-12 | Pin dependencies/images và reproducible builds |

## 15.3. P2 — Agency-ready

- GBP/local location management.
- Backlink/digital PR workflow.
- Ecommerce feeds/facets/product lifecycle.
- International/hreflang workflow.
- Media/News/Publisher module.
- CMS publishing connectors.
- Client approval portal.
- Capacity/SLA/profitability.
- Scheduled reports và executive dashboard.
- Migration command center.
- Incident/algorithm-update monitoring.
- AI Search visibility framework có evidence.

---

## 16. Lộ trình triển khai đề xuất

### Phase 0 — Security Stabilization

**Mục tiêu:** Có identity và authorization đáng tin cậy.

- Authentication/session redesign.
- DTO/global validation.
- Tenant/project authorization policy.
- CORS/security headers.
- Secret management.
- Security/negative tests.

**Exit gate:** Không còn P0 security; threat model và security tests được duyệt.

### Phase 1 — Audit Data Model

**Mục tiêu:** 296 control trở thành dữ liệu vận hành, không chỉ Markdown.

- Control schema.
- Applicability.
- Source/control relationship.
- Evidence/result/finding/action/QA schema.
- Version immutability.
- Migration và seed validation.

**Exit gate:** Một audit lịch sử có thể tái dựng đầy đủ standard, input, method, evidence và quyết định.

### Phase 2 — Technical SEO Audit MVP

**Mục tiêu:** Một module Technical thật sự đáng tin.

- Crawl graph.
- Indexability/canonical/redirect/sitemap/robots.
- Metadata/heading warnings có ngữ cảnh.
- Hreflang/schema.
- PSI/CrUX.
- Evidence viewer.
- Automated regression fixtures.

**Exit gate:** Technical controls được benchmark với fixtures và review thủ công.

### Phase 3 — Data, Measurement và Content

- GSC productionization.
- GA4.
- KPI/baseline/target/provenance.
- Keyword/SERP data quality.
- Content inventory/brief/approval/performance.
- Reporting.

### Phase 4 — Specialized SEO và Authority

- Local.
- Ecommerce.
- International.
- Publisher/media.
- Off-page/Digital PR.
- Entity/brand/trust.

### Phase 5 — Agency Operations

- Client portal.
- RACI/SLA/capacity.
- Approval and escalation.
- Profitability/resource reporting.
- Migration/incident workflows.
- External task/CMS connectors.

---

## 17. Definition of Done cho MavrykSEO Agency-ready

MavrykSEO chỉ nên được gọi là Agency-ready khi:

- Không còn Critical/P0 security finding.
- Mọi endpoint business đều có auth, tenant và project policy rõ.
- Full stack build/test/deploy được tái lập.
- Không có mock data/evidence trong production path.
- Mỗi control có applicability, source, method, input, result và acceptance criteria.
- Automated control có fixtures và false-positive review.
- Human control có evidence/owner/approver workflow.
- Audit run snapshot đủ để tái hiện lịch sử.
- Finding liên kết evidence và root cause.
- Action có owner, deadline, dependency và acceptance criteria.
- Done action có implementation evidence và QA evidence.
- GSC/GA4/CrUX/GBP/backlink/provider data có provenance/freshness.
- Client có thể review/approve/export trên cùng hệ thống.
- Hệ thống có backup/restore, incident response và observability.
- Claim “one-stop” được giới hạn đúng theo connector và feature thực tế.

---

## 18. Kết luận cuối cùng

MavrykSEO có giá trị lớn nhất ở ba nền móng:

1. Kiến trúc đa dịch vụ phù hợp bài toán SEO data platform.
2. Tư duy tenant/project/evidence/audit version đúng hướng.
3. Bộ standard 21 module giúp tránh sai lầm coi SEO chỉ là Technical Audit.

Nhưng dự án hiện có sự chênh lệch lớn giữa **tầm nhìn**, **giao diện**, **tài liệu standard** và **năng lực production đã kiểm chứng**.

### Định vị phù hợp hiện tại

> **SEO Agency OS alpha với crawler, GSC, keyword/content workflow, detector và versioned manual-audit foundation.**

### Định vị chưa được chứng minh

> **Nền tảng có thể kiểm tra toàn bộ SEO của mọi website và thay thế mọi công cụ bên ngoài.**

Ưu tiên đúng tiếp theo không phải mở thêm nhiều màn hình. Cần:

1. Khóa toàn bộ P0 security.
2. Chuyển 296 control thành machine-readable, evidence-driven controls.
3. Hoàn thiện một vertical slice end-to-end đáng tin: Data readiness → Technical audit → Finding → Action → QA → Measurement.
4. Sau khi vertical slice pass mới mở rộng tuần tự sang Content, Authority, Local, Ecommerce, International và Agency Operations.

Nếu triển khai theo thứ tự này, dự án có khả năng phát triển thành nền tảng Agency thật. Nếu tiếp tục bổ sung UI và checklist mô tả mà chưa xử lý identity, evidence và executor, hệ thống sẽ ngày càng lớn nhưng độ tin cậy không tăng tương ứng.

---

## Phụ lục A — Bằng chứng code chính

| Kết luận | File/area |
|---|---|
| Login chỉ dùng email | `apps/api/src/auth/auth.service.ts`, `auth.controller.ts` |
| Frontend auto-login test user | `apps/web/src/app/page.tsx` |
| CORS wildcard | `apps/api/src/main.ts` |
| ProjectGuard bypass khi không resolve ID | `apps/api/src/tenancy/project.guard.ts` |
| Tenant/project membership | `apps/api/src/tenancy/tenant.guard.ts`, `scoping.helper.ts` |
| Encryption AES-GCM | `packages/seo-core/src/crypto.ts` |
| Standard parser mất metadata | `packages/db/src/seed-standards.ts` |
| Standard validation chỉ kiểm tra cơ bản | `packages/db/src/validate-standards.ts` |
| Audit run/result workflow | `apps/api/src/audits/*` |
| Hard title/meta thresholds | `services/worker/src/detectors/title-meta-issue.detector.ts` |
| Orphan fallback giả | `services/worker/src/detectors/orphan-page.detector.ts` |
| AI provider/fallback | `services/ai/main.py` |
| Admin mock data | `apps/admin/src/app/page.tsx` |
| Full standard | `docs/MASTER-SEO-OPERATING-STANDARD-2026.md` |

## Phụ lục B — Nguồn đối chiếu chính

- Google Search Central — SEO Starter Guide: <https://developers.google.com/search/docs/fundamentals/seo-starter-guide>
- Google Search Central Documentation: <https://developers.google.com/search/docs>
- Google Structured Data: <https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data>
- RFC 9309 — Robots Exclusion Protocol: <https://www.rfc-editor.org/info/rfc9309/>
- WCAG 2.2: <https://www.w3.org/TR/WCAG22/>
- Core Web Vitals: <https://web.dev/articles/vitals>

---

**Trạng thái báo cáo:** Hoàn tất static assessment. Cần một vòng dynamic environment assessment sau khi có stack chạy được để xác nhận build, test, performance, security và SEO detection accuracy.

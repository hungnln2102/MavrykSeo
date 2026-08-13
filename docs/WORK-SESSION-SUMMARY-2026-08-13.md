# Tóm tắt phiên làm việc — 13/08/2026

## Mục đích

Tài liệu này ghi lại trạng thái công việc tại thời điểm dừng ngày **13/08/2026** để tiếp tục an toàn vào phiên sau. Backlog chính vẫn là `docs/PROJECT-EXECUTION-PLAN.md`.

## Nguyên tắc tiếp tục

- Khi chọn một task trong execution plan, phải hoàn tất mọi dependency nội bộ, code, test, tài liệu và validation cần thiết trước khi tick `[x]`.
- Chỉ giữ `[~]` hoặc `[ ]` khi bị chặn thật sự bởi human approval, provider contract/credential, hoặc infrastructure/production evidence.
- Không khởi động hoặc để lại API/worker dev process nền nếu không được yêu cầu rõ; đã từng phát sinh xung đột port.
- Không discard hoặc revert các thay đổi chưa commit hiện có.
- Tuân thủ `AGENTS.md`: tenant scope server-side, không log secrets/tokens, PostgreSQL là business truth, ClickHouse là historical observations, S3 là raw/reprocessable artifacts.

## Hoàn thành và đã tick

### P0-A1 — Establish repository CI

- Đã `Done` trong execution plan.
- CI có secret/dependency/container scan và runbook remediation.

### P0-A2 — Make quality gates real

- Đã `Done` và tick toàn bộ tại `docs/PROJECT-EXECUTION-PLAN.md`.
- Thêm responsive layout cho dashboard tại `apps/web/src/app/globals.css` và semantic class hooks tại `apps/web/src/app/page.tsx`.
- Thêm Playwright cấu hình tại `playwright.config.ts`.
- Thêm browser test tại `tests/browser/responsive.spec.ts` cho 5 viewport bắt buộc:
  - mobile: `375x667`
  - tablet: `768x1024`
  - min-PC: `1280x800`
  - standard-PC: `1440x900`
  - max-PC: `2560x1440`
- Browser test kiểm tra dashboard navigation và không có horizontal overflow.
- CI chạy `pnpm exec playwright install --with-deps chromium` và `pnpm exec playwright test`.
- Thêm `@playwright/test@1.62.1` vào root dev dependencies và cập nhật `pnpm-lock.yaml`.
- Cập nhật `tests/TEST-MATRIX.md` và `.gitignore` cho Playwright artifacts.

### P0-A3 — Reproducible local environment and migration discipline

- Đã `Done` trong execution plan.
- Docker local services, migrations, DB check và seed idempotent đã được xác nhận ở phiên trước.

## Đã làm nhưng task còn mở

### P0-D1 — Prove tenant isolation and RBAC

- Thêm `apps/api/src/jobs/jobs.controller.spec.ts`.
- Test xác minh failed-job/replay controller truyền nguyên `workspaceId` do guard xác thực vào service.
- Test metadata RBAC owner/admin và audit event cho read/replay.
- Service replay đã validate typed crawl/rank payload trước persistence và queue dispatch.
- Vẫn `[~]`: còn worker regression tests và coverage các controller/API còn lại.

### P0-D2 — Secrets, OAuth credentials, and auth lifecycle

- Thêm `apps/api/src/tenancy/rate-limit.guard.spec.ts`.
- Test rate-limit login theo IP: 60 request/phút bị chặn; IP khác có quota độc lập.
- Vẫn `[~]`: auth hiện chưa có session/password storage, refresh token rotation, logout hay JWT revocation. Không tự thay auth architecture khi chưa có thiết kế/migration/approval phù hợp.

### P0-D4 — Jobs, retries, idempotency, and dead-letter operations

- Shared job contracts/fixtures trong `packages/seo-core/src/jobs.ts` và `packages/seo-core/src/job-contract.fixtures.ts`.
- API producer và worker consumer dùng typed Crawl/Rank job payload; replay giữ `ingestionKey` historical nhưng tạo idempotency key mới.
- Vẫn `[~]`: còn alert deployment và real-provider outage drill.

### P0-B3 — SERP/rank collection and provider contract

- Đã loại bỏ `search_volume` ngẫu nhiên khỏi SERP worker: `services/worker/src/serp.processor.ts` ghi `0` khi không có provider được phê duyệt.
- Vẫn `[~]`: cần provider contract, metadata, raw snapshots, scheduling/quota/cost thực tế.

## Validation đã chạy thành công

- `pnpm exec playwright test` — 5/5 responsive tests pass.
- `pnpm lint` — pass.
- `pnpm typecheck` — pass toàn workspace.
- `pnpm test` — pass; API có 18 suites / 74 tests pass.
- `pnpm build` — pass toàn workspace.
- `git diff --check` — pass ở lần kiểm tra cuối của từng thay đổi.
- Port `3101` không còn listener sau Playwright test.

## P0-B1 — Google Search Console production integration

### Trạng thái khi dừng

- **Chưa bắt đầu code P0-B1**; không tick task nào của P0-B1.
- Hiện repo chỉ có generic encrypted integrations tại `apps/api/src/integrations/integrations.service.ts`; chưa có OAuth GSC riêng, callback, property selection hay GSC sync worker.
- P0-B1 phụ thuộc P0-D2 và P0-D4; các phần auth lifecycle/job operations liên quan vẫn mở.

### Luồng sản phẩm cần triển khai

1. Khách tạo workspace/project và nhập domain của họ.
2. Khách nhấn Connect Google Search Console.
3. Backend tạo OAuth authorization request với scope tối thiểu read-only và PKCE/state tenant-scoped.
4. Khách đăng nhập Google, đồng ý quyền cho app, rồi Google callback vào backend.
5. Backend validate callback/state/PKCE, đổi authorization code lấy token và mã hóa refresh token trước khi lưu.
6. Backend gọi GSC sites list; khách chỉ thấy GSC properties mà Google account của họ được phép truy cập.
7. Khách chọn property phù hợp cho project (`sc-domain:...` hoặc URL-prefix).
8. Worker backfill/incremental sync GSC theo tenant/project/property; raw response vào `raw/gsc` S3, normalized data vào ClickHouse, sync state/error vào PostgreSQL.
9. UI/API hiển thị sync status, date range, freshness, retry state và safe provider errors.

### Cấu hình một lần bởi đội MavrykSEO

Tạo Google Cloud OAuth client loại Web application, bật Google Search Console API, dùng scope:

```text
https://www.googleapis.com/auth/webmasters.readonly
```

Không dùng Google OAuth client/secret chung của khách hàng. Khách chỉ đăng nhập và cấp quyền cho GSC property của họ.

Thêm secrets vào local/staging/production secret store, không commit hoặc gửi trong chat:

```env
GSC_OAUTH_CLIENT_ID=...
GSC_OAUTH_CLIENT_SECRET=...
GSC_OAUTH_REDIRECT_URI=https://api.example.com/integrations/google-search-console/callback
```

Local development có thể dùng:

```env
GSC_OAUTH_REDIRECT_URI=http://localhost:3000/integrations/google-search-console/callback
```

Giữ các secrets hiện có:

```env
JWT_SECRET=...
GSC_TOKEN_ENCRYPTION_KEY=...
```

### Cần trước khi đóng P0-B1

- Google Cloud project có Search Console API enabled.
- OAuth consent screen được cấu hình; test users được thêm khi app còn ở testing mode.
- Redirect URI chính xác được đăng ký cho local và staging/production.
- GSC sandbox/test property có quyền cho Google account test.
- Quyết định retry/quota/backoff và operational ownership cho sync provider.
- Chạy sandbox/test-account flow: authorize, select property, backfill, incremental sync, refresh, revoke/reconnect, partial failure recovery.
- Có production/pilot evidence vì acceptance yêu cầu real GSC property.

## Điểm bắt đầu khuyến nghị ngày mai

1. Kiểm tra Google Cloud OAuth configuration và GSC sandbox property theo phần P0-B1 ở trên.
2. Khi các secrets đã có trong `.env` cục bộ, triển khai P0-B1 cùng các phần dependency cần thiết của P0-D2/P0-D4 để đóng trọn luồng GSC.
3. Nếu chưa có OAuth provider credentials, chọn task P0 khác có thể đóng cục bộ thay vì mở thêm một task bị chặn.

## Working tree cần giữ nguyên

Có nhiều thay đổi chưa commit từ các phiên trước, gồm CI/security scanning, job contracts/replay, API tests, worker processors, responsive E2E, plan/test matrix và runbooks. Không reset/revert toàn bộ working tree.


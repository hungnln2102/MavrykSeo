# Test Matrix

## Purpose

This matrix separates deterministic CI checks from tests that require Docker services, local credentials, or provider mocks. A passing deterministic suite does not prove a production integration is ready.

| Tier | Command | Environment | Current coverage | CI status |
| --- | --- | --- | --- | --- |
| Static | `pnpm lint` | None | API lint and Next.js lint | Required |
| Typecheck | `pnpm typecheck` | None | API, worker, web, admin, shared packages | Required |
| Unit | `pnpm test` | None | API `RolesGuard` authorization behavior | Required |
| Build | `pnpm build` | None | All workspace production builds | Required |
| Integration | `pnpm test:integration` | Isolated AI service, provider mocks, approved local data services | Worker detector verification | Manual / future Docker Compose CI |
| Service hardening | `pnpm --filter api exec ts-node src/verify_hardening.ts` | Local PostgreSQL, ClickHouse, Redis, API | Health, readiness, rate limit, encrypted integrations, audit logging | Manual |
| API workflow scripts | `pnpm --filter api exec node verify_rbac.js` and related scripts | Local API + data services | RBAC, research/rank, quota, content workflows | Manual |
| Production smoke | Release owner procedure | Staging/production only | Auth, health/readiness, queues, source syncs, dashboards | Release gate |

## Rules

- Fixtures must use a dedicated demo workspace/project and never production credentials or customer data.
- Integration tests may create data only in isolated local/staging environments and must clean up deterministically.
- Browser coverage must eventually include mobile, tablet, min-PC, standard PC, and max-PC breakpoints.
- Provider, crawler, SERP, GSC, and AI tests must assert quota/rate-limit/retry behavior before being marked production-ready.
- A skipped integration test must be visible in CI documentation; it must not silently become a passing test.

## Next coverage tasks

- Add unit tests for `TenantGuard` with database adapters or a test database.
- Add API controller/service contract tests for tenant-scoped reads and writes.
- Move detector verification to an explicit Docker Compose integration job once the Python AI test image and service health check are deterministic.
- Add responsive browser E2E coverage for onboarding, Site Audit, Rank Tracker, Settings, and Action Center.
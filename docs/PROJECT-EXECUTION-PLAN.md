# MAVRYKSEO — Project Execution Plan

> **Status:** Canonical execution source  
> **Created:** 2026-08-13  
> **Owner:** Product + Engineering  
> **Purpose:** The single authoritative plan for product direction, unfinished work, delivery status, dependencies, and release gates.

## 0. Product direction and governance

MAVRYKSEO is an **SEO Operating System for agencies and in-house teams**. The product turns trustworthy search observations into accountable, measurable work:

`Observe → Diagnose → Prioritize → Execute → Verify → Measure → Learn`

The core user questions are:

1. What changed, for which workspace/project, and what source, date, scope, and freshness support the evidence?
2. Why does it matter, based on deterministic rules and versioned scoring?
3. What action should happen next, by whom, and with what approval or client visibility?
4. Did the completed action improve the outcome, with a recorded comparison window and limitations?

### Source-of-truth hierarchy

1. Code, migrations, and verified test evidence.
2. Accepted ADRs plus architecture, security, and data-ownership documents.
3. This document for execution status, priority, dependencies, and release gates.
4. Issues, PRs, historical files, or chat context.

### Non-negotiable delivery rules

- PostgreSQL is business state; ClickHouse is historical observation; S3-compatible storage is raw/reprocessable artifacts; Redis is ephemeral queue/cache only.
- Customer data, jobs, artifacts, and external workloads must be workspace/project scoped and authorized server-side.
- UI and data contracts distinguish **observed**, **derived**, and **AI-generated** outputs. AI cannot fabricate traffic, rankings, search volume, or source evidence.
- External workloads require validation, idempotency, bounded retries, quotas/budgets, kill switches, failure handling, and audit-safe telemetry.
- New core infrastructure, provider, framework, or service boundary requires an Accepted ADR under `docs/architecture/ADR-POLICY.md`.

### Product sequencing rule

Do not expand dashboards or intelligence features ahead of reliable data lineage, tenant isolation, source freshness, failure recovery, observability, and cost controls. A feature is only complete when it supports a real workflow and meets the Universal Definition of Done below.
## 1. How to use this plan

### Status vocabulary

- **Not started** — no implementation evidence has been verified.
- **In progress** — an owner is actively implementing it.
- **Blocked** — cannot proceed without a decision, credential, provider contract, or infrastructure access.
- **Ready for verification** — implementation exists but is missing required acceptance evidence.
- **Done** — acceptance criteria, tenant/RBAC checks, tests, observability, and documentation are complete.

### Priority rules

- **P0** blocks trustworthy pilot usage or production safety. Do not start P1 feature expansion while P0 blockers remain.
- **P1** enables the complete agency workflow after P0 is stable.
- **P2** improves commercial capability and operations after pilot validation.
- **P3** is intentionally deferred; it requires measured pilot demand or an Accepted ADR where applicable.

### Universal Definition of Done

Every product or operational task must have all applicable evidence:

- [ ] Product specification and acceptance examples are documented.
- [ ] PostgreSQL business state, ClickHouse observations, S3 raw artifacts, and Redis ephemeral state follow `DATA-OWNERSHIP.md`.
- [ ] API/worker/UI integration uses real data; production UI never silently falls back to mock metrics.
- [ ] Workspace/project tenant scope and RBAC are enforced server-side.
- [ ] Loading, empty, stale-data, retry, and error states are implemented.
- [ ] Idempotency, retries, rate limits, quotas, and kill switch exist for paid/external workloads.
- [ ] Unit/integration/E2E tests cover the critical path and regression risk.
- [ ] Structured logs, metrics, trace/error reporting, and runbook updates exist.
- [ ] Feature flag, migration plan, rollback path, and security review exist for risky changes.
- [ ] `lint`, `typecheck`, relevant tests, and `build` pass.

### Execution metadata and evidence standard

Every P0/P1 work item must retain this metadata directly below its status. Do not create a separate tracker that can drift from this plan.

| Field | Required standard |
|---|---|
| Accountable owner | One named Product, Engineering, SEO, or Operations owner; contributors may be listed separately |
| Next decision | The smallest concrete decision or implementation action that can move the item forward |
| Dependency/blocker | Exact backlog ID, provider decision, credential, environment, or human approval required |
| Risk | `Low`, `Medium`, `High`, or `Release-blocking`, with the user/data/cost consequence stated |
| Evidence | Test command/result, migration ID, staging workspace proof, dashboard/trace, runbook, or review record |
| Target | A milestone/date only when an accountable owner has accepted it; do not invent dates |

Use this evidence format when changing a status:

```text
Evidence: <UTC date> — <environment> — <command or workflow> — <result> — <artifact/link/path>
```

Status transitions are evidence-gated:

- `Not started → In progress`: owner and next decision are recorded.
- `In progress → Ready for verification`: implementation is deployed or runnable in the intended environment, with evidence listed.
- `Ready for verification → Done`: acceptance criteria, security/tenant checks, relevant tests, observability, documentation, and rollback/support implications are verified.
- Any item with an unresolved production-safety issue returns to `In progress` or `Blocked`; never keep it `Done` by historical convention.
## 2. Verified repository snapshot — 2026-08-13

### Architecture and implementation present

- Next.js customer UI in `apps/web`, internal admin UI in `apps/admin`, NestJS/Fastify API in `apps/api`.
- PostgreSQL/Drizzle business schema, ClickHouse historical schema, Redis/BullMQ workers, S3-compatible storage, Go crawler/collector, and FastAPI AI service are present.
- Existing API domains include workspaces, projects, sites, integrations, keywords, content, recommendations, reports, tenancy/RBAC, and health checks.
- Worker has crawl, SERP, detector processors and an initial detector library.
- Existing verification scripts cover parts of RBAC, research/rank tracking, quota/white-label, content marketing, and hardening.

### Recent verified fixes

- [x] Turbo `dev` builds workspace dependencies before applications start.
- [x] `@seo/core` resolves from its built `dist` entrypoint.
- [x] Web and admin builds no longer require Google Fonts network access.
- [x] Next.js lint is configured non-interactively and the full workspace build passes.

### Known quality debt

- [ ] `apps/web/src/app/page.tsx` has three `react-hooks/exhaustive-deps` warnings. Refactor fetch callbacks with `useCallback` or a reducer/query layer, then prove no duplicate fetches or stale closures.
- [x] Deterministic CI now runs lint, explicit typechecks, API RBAC unit tests, and builds. Worker detector verification remains an integration test because it requires the Python AI service and mocks external data; add a Docker Compose integration-test job before making it required CI.
- [x] GitHub Actions CI is defined in `.github/workflows/ci.yml` and runs frozen-lockfile install, lint, typecheck, deterministic tests, and build.
- [ ] Historical task files mark broad areas complete while production-readiness documents remain unchecked. Use this plan and acceptance evidence—not checkmarks in legacy files—as the current state.

## 3. Execution order and dependency map

1. **Foundation gates:** CI, test strategy, environment reproducibility, migration safety.
2. **Trustworthy data plane:** GSC, crawler, SERP/rank ingestion with raw lineage, freshness, idempotency, quotas, and retry behavior.
3. **P0 customer workflows:** onboarding/settings, Site Audit, Rank Tracker, Action Center.
4. **P0 security/reliability/observability:** tenant proof, OAuth/secret handling, SSRF proof, recovery, telemetry, operational controls.
5. **P1 agency workflow:** roles, assignments, comments/notes, approvals, reports.
6. **P1 content workflow:** research through performance/refresh loop.
7. **P2 commercial/pilot validation:** billing entitlements, support operations, measured pilot iteration.

## 4. P0-A — Engineering foundation and delivery gates

### P0-A1 — Establish repository CI

- **Status:** Done
- **Dependencies:** none
- **Scope:** GitHub Actions workflow for pull requests and the protected default branch is implemented.
- **Tasks:**
  - [x] Run deterministic dependency install using the pinned pnpm version and frozen lockfile.
  - [x] Run lint, explicit typecheck commands, deterministic unit tests, migration metadata validation, and build; integration tests remain documented as a separate gate.
  - [x] Cache pnpm store without caching generated database data or secrets.
  - [x] Add dependency/container/secret scanning with a documented remediation policy.
  - [ ] Upload test reports and build artifacts only when they contain no customer data/secrets.
- **Acceptance:** A clean clone passes CI; a deliberate lint/type/build failure fails CI; no credentials are needed for static checks.

### P0-A2 — Make quality gates real

- **Status:** Done
- **Dependencies:** P0-A1
- **Scope:** Typechecks, deterministic API RBAC tests, migration metadata checks, and the test matrix are implemented; expand integration, controller/service, and responsive E2E coverage.
- **Tasks:**
  - [x] Add `typecheck` scripts for API, worker, web, admin, and packages.
  - [x] Add API Jest configuration and RBAC unit tests; keep worker detector verification as an explicit integration test.
  - [x] Add fixtures for API/worker contracts without using production credentials or customer data.
  - [x] Define test tiers in `tests/TEST-MATRIX.md`; Docker Compose E2E and production smoke coverage remain open.
  - [x] Ensure browser UI tests cover responsive breakpoints: mobile, tablet, min-PC, standard PC, and max-PC. Playwright starts the local Next.js app, verifies dashboard navigation and horizontal overflow at all five viewports, and runs in CI.
- **Acceptance:** `pnpm typecheck` and `pnpm test` execute meaningful tasks in every applicable workspace and produce a clear report of skipped integration tests.

### P0-A3 — Reproducible local environment and migration discipline

- **Status:** Done
- **Dependencies:** P0-A1
- **Tasks:**
  - [x] Correct and verify local commands; add root `db:generate`, `db:migrate`, `db:check`, `local:up`, and `local:down` scripts.
  - [x] Add deterministic demo seed fixtures scoped to a fixed demo workspace/project; the command is confirmation-gated and disabled in production.
  - [x] Document migration review, forward-only migration, backup-before-migrate, and rollback/repair procedures.
  - [x] Add automated migration verification from an empty PostgreSQL CI service: run migrations twice and the confirmation-gated demo seed twice. Manual local smoke also passed on 2026-08-13.
- **Acceptance:** A new developer can start all local dependencies, migrate, seed, run services, and execute smoke tests without manual database edits.

## 5. P0-B — Data integrity and source integrations

### P0-B1 — Google Search Console production integration

- **Status:** Not started / requires production evidence
- **Dependencies:** P0-A3, P0-D2, P0-D4
- **Tasks:**
  - [ ] Implement OAuth authorization with minimum scopes, PKCE/state validation, callback validation, and property selection.
  - [ ] Store refresh tokens encrypted at rest; keep encryption keys outside PostgreSQL and never log tokens.
  - [ ] Implement initial backfill and incremental sync with workspace/project ownership checks.
  - [ ] Persist raw provider responses to `raw/gsc` in S3, normalized daily observations to ClickHouse, and sync state/errors to PostgreSQL.
  - [ ] Implement refresh, revoke, reconnect, quota handling, retry/backoff, idempotency keys, and partial-failure recovery.
  - [ ] Expose sync status, last successful sync, date range, freshness, retry state, and provider errors in API/UI.
  - [ ] Add provider sandbox/test-account integration tests and token rotation/revocation tests.
- **Acceptance:** A pilot workspace connects a real GSC property, backfills safely, performs repeatable incremental syncs without duplicates, and displays freshness/health from stored facts.

### P0-B2 — Crawler ingestion, safety, and audit lineage

- **Status:** Ready for verification
- **Dependencies:** P0-A3, P0-D3, P0-D4
- **Tasks:**
  - [ ] Test SSRF controls for private CIDRs, link-local addresses, cloud metadata, DNS rebinding, redirects, non-HTTP protocols, and IPv6.
  - [~] Enforce per-workspace/project crawl quotas, concurrency, response size, timeout, robots/sitemap policy, and kill switch. Workspace/project `crawl_enabled` policy and effective concurrency caps now block dispatch before BullMQ; `CRAWL_KILL_SWITCH=true` blocks both dispatch and worker outbound requests. Site cadence can be configured from 60 minutes and is dispatched with deterministic execution-window idempotency; quota-window, robots, and sitemap policy remain.
  - [~] Store raw fetch artifacts in S3 with request/crawl identifiers and write normalized observations to ClickHouse. Raw HTML is now stored append-only under `raw/crawl/{workspaceId}/{siteId}/{ingestionKey}/...` before ClickHouse normalization; the durable ingestion fence is acquired before either write. A legacy `crawl/{siteId}/...` latest copy remains temporarily for existing detectors; artifact-reference migration and staging verification remain.
  - [~] Persist crawl configuration, run state, failures, and history in PostgreSQL; do not overwrite historical observations. Site-level `crawl_schedule_minutes`, tenant-scoped `job_runs`, deterministic scheduled-run identities, and state transitions are persisted; local migration bootstrap has been verified against a pre-existing schema without data deletion. A dedicated crawl-run/history model and staging evidence remain.
  - [~] Trigger detectors only after normalized data is committed; make retries idempotent. Crawl retries acquire the PostgreSQL ingestion fence before raw or normalized writes and mark it completed only after ClickHouse succeeds. Detector triggering order and integration verification remain.
  - [ ] Surface crawl progress, errors, last completed crawl, evidence URLs, and data freshness in Site Audit.
- **Acceptance:** An approved public target can be crawled; forbidden destinations are blocked; retrying a job does not duplicate facts; every issue links to observed evidence and crawl run.

### P0-B3 — SERP/rank collection and provider contract

- **Status:** Not started / provider decision required
- **Dependencies:** P0-A3, P0-D4
- **Tasks:**
  - [ ] Select/approve a SERP provider contract: regions, language, device, rate limits, terms, cost, and error semantics.
  - [~] Model tracked keyword configuration in PostgreSQL and immutable observation/snapshot history in ClickHouse/S3. The interim collector has no approved volume provider, so SERP ingestion records `search_volume` as `0` rather than fabricating a metric; provider metadata and raw snapshots remain pending.
  - [ ] Implement scheduling, provider retries/backoff, idempotency, partial result handling, and stale result labeling.
  - [ ] Track per-project provider usage/cost, quotas, alerts, and kill switch.
  - [ ] Add fixtures for country/device/SERP feature parsing and provider failure modes.
- **Acceptance:** A scheduled keyword collection produces queryable historical positions and provider metadata, never invents metrics, and stops safely at project quota.

### P0-B4 — Data lineage, freshness, and reprocessing

- **Status:** Not started
- **Dependencies:** P0-B1, P0-B2, P0-B3
- **Tasks:**
  - [ ] Define shared lineage fields: source, source record/crawl/job ID, observed-at, ingested-at, normalization version, and derivation version.
  - [ ] Add sync/crawl/collection health records and freshness SLOs.
  - [ ] Provide an authorized raw-artifact reprocessing flow that creates new derived results rather than overwriting history.
  - [ ] Label observed, derived, estimated, and AI-generated values across API/UI.
- **Acceptance:** Any displayed metric/recommendation can be traced to source and version; stale or failed data is visible to users and operators.

## 6. P0-C — Core customer workflows

### P0-C1 — Onboarding and project setup

- **Status:** Not started
- **Dependencies:** P0-B1, P0-B2, P0-B3
- **Tasks:**
  - [ ] Create workspace/project/site setup wizard with server-side tenant checks.
  - [ ] Collect business context, target country/language/device, crawl configuration, tracked keywords, and GSC connection.
  - [ ] Persist progress and permit safe resume; never expose another workspace’s setup state.
  - [ ] Trigger first crawl, initial rank collection, and GSC backfill only after explicit confirmation and quota validation.
  - [ ] Measure time-to-first-value and show first-data status/errors.
- **Acceptance:** A new pilot can reach first verified insights/action from a blank workspace without manual database changes.

### P0-C2 — Site Audit complete vertical slice

- **Status:** Ready for verification
- **Dependencies:** P0-B2, P0-B4, P0-E1
- **Tasks:**
  - [ ] Verify UI/API uses crawl observations and recommendation evidence rather than mock data.
  - [ ] Complete health overview, run history, category/severity filters, affected URLs, evidence, explanation, and action creation.
  - [ ] Implement loading/empty/error/stale-data states and responsive layouts.
  - [ ] Add permission-aware access and E2E coverage across crawl start, progress, issue review, and action acceptance.
- **Acceptance:** A user can start a crawl, inspect real issues with traceable evidence, and create a tracked action in a tenant-safe flow.

### P0-C3 — Rank Tracker complete vertical slice

- **Status:** Ready for verification
- **Dependencies:** P0-B3, P0-B4, P0-E1
- **Tasks:**
  - [ ] Verify real historical observations power current/previous/best position, delta, landing URL, country/device, and SERP feature displays.
  - [ ] Complete keyword add/import, schedule, history chart, winners/losers, top 3/10/20/100 distribution, and competitor visibility.
  - [ ] Expose collection freshness/provider failures/quota state; distinguish no data from zero ranking.
  - [ ] Add E2E tests for configuration, collection, history, and failure/empty states.
- **Acceptance:** A project owner sees accurate, scoped rank history with a visible source/date/device and can act on changes.

### P0-C4 — Settings and integration control plane

- **Status:** Ready for verification
- **Dependencies:** P0-B1, P0-B2, P0-B3, P0-D2
- **Tasks:**
  - [ ] Complete project/site/integration/crawl/rank settings with authorization and audit logs.
  - [ ] Provide credential reconnect/revoke without returning secrets to the UI.
  - [ ] Add plan/quota display, destructive-action confirmation, and change history.
  - [ ] Validate responsive, loading/error states and API contracts.
- **Acceptance:** Authorized users can manage configuration safely, while client/viewer roles cannot access internal/security-sensitive controls.

### P0-C5 — Action Center cross-module workflow

- **Status:** Not started
- **Dependencies:** P0-C2, P0-C3, P0-E1
- **Tasks:**
  - [ ] Define canonical action/recommendation schema and lifecycle: Detected → Shown → Accepted/Rejected → Assigned → In Progress → Completed → Verified → Measured.
  - [ ] Link actions to source detector/data/evidence and retain immutable history.
  - [ ] Aggregate actions from technical audit, GSC, rank tracking, content, and competitor intelligence without duplicating business logic.
  - [ ] Implement assignee, priority, due date, status, notes, audit activity, and permission-aware views.
  - [ ] Add verification/measurement fields tied to later observations; do not claim causal improvement without evidence.
- **Acceptance:** A user can manage a source-traceable action from detection through measured verification with tenant isolation.

## 7. P0-D — Security, reliability, and operational control

### P0-D1 — Prove tenant isolation and RBAC

- **Status:** In progress
- **Dependencies:** P0-A2
- **Tasks:**
  - [~] Build automated negative tests for every read/write API: forged workspace/project IDs, role changes, direct object ID access, and background-job payloads. Guard-level coverage rejects unauthenticated, missing-header, forged-workspace, missing-workspace, and suspended-workspace requests; service coverage includes Projects, Sites, Keywords, Recommendations, Reports, Content, Integrations, Workspaces, and cross-tenant failed-job replay/listing. Failed-job controller tests verify the guard-provided workspace is delegated unchanged and owner/admin plus audit metadata remain attached. Crawl and rank workers now require workspace context and revalidate PostgreSQL ownership; replay validates the typed payload contract before queue dispatch. Worker regression tests and coverage of remaining controllers remain.
  - [~] Verify Client role cannot access internal notes, admin data, credentials, or workspace configuration. Recommendation reads mask internal notes; Integration credential reads, workspace members, and white-label configuration require owner/admin. Remaining admin data needs review.
  - [~] Ensure queries are workspace/project scoped by design and are reviewed in controllers/services/workers. Projects, Sites, Keywords, Recommendations, Reports, Content, Integrations, Workspace mutation paths, and crawl/rank worker entry points are covered; remaining domains need review.
  - [~] Add audit events for security-sensitive mutations and access-denied events where appropriate. Crawl requests, Report creation, Recommendation mutations, Content write/AI operations, Integration credential reads/writes, and Workspace administration emit audited success events without request body values; access-denied coverage remains.
- **Acceptance:** Cross-tenant and unauthorized access attempts consistently receive denial and never return metadata or data.

### P0-D2 — Secrets, OAuth credentials, and auth lifecycle

- **Status:** In progress
- **Dependencies:** P0-A3
- **Tasks:**
  - [x] Replace development fallback encryption key with a fail-closed production configuration validated at startup. Production startup now requires JWT_SECRET plus GSC_TOKEN_ENCRYPTION_KEY or ENCRYPTION_KEY; regression tests cover missing and configured values.
  - [~] Integrate production secret manager and document local/staging/production secret separation. Environment separation and approved-secret-manager requirements are documented; provider-specific secret-manager integration remains.
  - [~] Verify password/token/API-key redaction across logs, errors, telemetry, and audit events. Audit regression coverage confirms request body values are not written; broader log and telemetry redaction remains.
  - [~] Test OAuth encryption/decryption, key rotation/migration plan, refresh/revoke, and compromised-token response. Encryption/decryption and a documented rotation plan are covered; migration execution, refresh/revoke, and compromised-token response remain.
  - [~] Verify auth session/JWT expiry, rotation, logout/revocation, and rate-limited login behavior. Auth guard regression tests cover valid, expired, malformed, and malformed-header tokens; login/register endpoints are rate-limited, and rate-limit regression tests confirm repeated login attempts are capped per IP without consuming another IP's budget. Rotation, logout, and revocation remain.
- **Acceptance:** No secret is committed or logged; production cannot start with unsafe fallback encryption; credentials remain recoverable through an approved rotation process.

### P0-D3 — Crawler and outbound workload hardening

- **Status:** Ready for verification
- **Dependencies:** P0-B2
- **Tasks:**
  - [x] Execute automated SSRF test corpus and enforce redirect/DNS/IP revalidation. Go tests cover forbidden IPv4/IPv6, metadata IP, localhost, URL credentials, invalid schemes, response limits, and valid public HTTP/HTTPS; redirects are revalidated before connection.
  - [x] Confirm crawler has no direct production database access beyond approved service boundaries. The crawler Go module has no PostgreSQL client or database configuration; the worker owns PostgreSQL access and tenant validation.
  - [x] Add a system kill switch and tenant-scoped crawl concurrency gate before queue dispatch, with worker-side revalidation before outbound requests. PostgreSQL workspace/project policy fields, `CRAWL_KILL_SWITCH`, migration `0009_gigantic_reptil.sql`, and API regression tests cover disabled scopes and reached limits.
  - [x] Set resource limits, outbound allowlist policy, request caps, and circuit breakers. Request/server/response/redirect/time limits are enforced; production fails closed without `CRAWLER_OUTBOUND_ALLOWLIST`, and an in-memory per-host breaker has configurable failure/cooldown thresholds.
  - [x] Capture security-relevant denial/timeout events without logging sensitive URL credentials. Crawler emits structured `outbound_event` records with normalized hostnames and safe reason codes only; client responses remain generic and regression tests verify credential/path masking.
- **Acceptance:** Security test corpus passes and operator can disable crawling immediately per system/project.

### P0-D4 — Jobs, retries, idempotency, and dead-letter operations

- **Status:** In progress
- **Dependencies:** P0-B1, P0-B2, P0-B3
- **Tasks:**
  - [~] Standardize job payload envelope: tenant/project identifiers, idempotency key, trace/correlation ID, attempt metadata, and schema version. Crawl/rank jobs now use a versioned envelope with workspace context, correlation ID, stable idempotency key, and worker validation; producer regression tests cover the payload contract. Attempt metadata remains.
  - [~] Configure bounded retry/backoff by workload and explicit non-retryable errors. Crawl/rank producers use three attempts with exponential backoff and deterministic job IDs. Shared error taxonomy now prevents retry for invalid payload and tenant-scope failures; transient provider, storage, and unexpected failures remain retryable. Provider-specific authentication/quota classifications remain.
  - [~] Persist failure state and provide admin-authorized retry/replay controls. PostgreSQL `job_runs` records tenant-scoped queued/active/completed/failed lifecycle, attempt count, safe failure code/message, correlation ID, idempotency key, and replayable payload for crawl/rank jobs. `GET /jobs/failed` and `POST /jobs/:jobRunId/replay` require owner/admin, return redacted metadata, audit access/replay, scope all reads to the active workspace, and create a new replay job with lineage to the failed job. HTTP controller integration coverage and operator UI remain.
  - [~] Implement dead-letter/failure queue workflow, alerts, and runbook. Final crawl/rank/SERP failures now transition to durable PostgreSQL `dead_lettered` state; worker exports `job_dead_letter_total` by low-cardinality queue/job/error-code labels, and `docs/runbooks/INCIDENT-RUNBOOK.md` defines safe diagnosis/replay/escalation. Alert-rule deployment and a forced real-provider outage drill remain.
  - [~] Prevent duplicate ingestion and repeated external spend after retries. Crawl/rank jobs use deterministic BullMQ job IDs derived from idempotency keys. A durable PostgreSQL `ingestion_fences` guard now preserves a logical ingestion key across replay, permits only the first crawl/rank write to ClickHouse, marks completed ingestion, and dead-letters ambiguous in-progress writes for operator reconciliation rather than inserting duplicate historical facts. Provider-spend idempotency and a real-provider outage drill remain.
- **Acceptance:** A forced provider outage yields observable failed jobs, safe retries, no duplicate historical facts, and an operator recovery path.

**Evidence:** 2026-08-13 — local — `pnpm --dir packages/seo-core build && pnpm --dir packages/db typecheck && pnpm --dir packages/db db:check && pnpm --dir apps/api test -- jobs.service.spec.ts jobs.spec.ts sites.service.spec.ts keywords.service.spec.ts && pnpm --dir apps/api typecheck && pnpm --dir apps/api build && pnpm --dir services/worker typecheck && pnpm --dir services/worker build && docker compose config --quiet && docker run --rm -v "${PWD}/infra/docker/prometheus.yml:/etc/prometheus/prometheus.yml:ro" -v "${PWD}/infra/docker/prometheus-rules:/etc/prometheus/rules:ro" --entrypoint /bin/promtool prom/prometheus:latest check config /etc/prometheus/prometheus.yml` — passed; regression coverage verifies producer persistence, retry classification, redacted dead-letter reads, cross-workspace replay denial, payload integrity, replay lineage, and preserved logical ingestion keys. Prometheus validates one dead-letter alert rule; `docker-compose.yml` mounts it. Migrations: `packages/db/drizzle/0005_mute_madame_web.sql`, `packages/db/drizzle/0006_volatile_obadiah_stane.sql`, `packages/db/drizzle/0007_chubby_pride.sql`, `packages/db/drizzle/0008_absurd_captain_cross.sql`.

### P0-D5 — Backups, restore, and deployment safety

- **Status:** Not started
- **Dependencies:** P0-A3
- **Tasks:**
  - [ ] Define PostgreSQL, ClickHouse, and S3 backup retention, encryption, ownership, and recovery objectives.
  - [ ] Automate backup scheduling and monitor success/failure.
  - [ ] Perform documented restore drills into isolated environments; verify tenant data integrity and application compatibility.
  - [ ] Define deployment health/readiness checks, graceful shutdown, resource limits, feature-flag rollback, and post-deploy smoke tests.
- **Acceptance:** Restore evidence exists for all state stores and a deployment can be rolled back without destructive data loss.

### P0-D6 — Observability and cost controls

- **Status:** Not started
- **Dependencies:** P0-D4
- **Tasks:**
  - [ ] Propagate correlation IDs API → job → crawler/collector/AI → stored result.
  - [ ] Complete OpenTelemetry traces, Sentry error reporting, Prometheus metrics, and Grafana dashboards.
  - [ ] Add metrics/SLOs: API health, queue depth/failure, GSC lag, crawl success, SERP success, detector success, AI latency/cost, and provider cost/project.
  - [ ] Implement project/workspace quotas, budgets, alerts, and kill switches for pages, keywords, SERP calls, and AI workloads.
- **Acceptance:** Operators can identify failing tenant/workload/source, trace it end-to-end, and prevent uncontrolled spend.

## 8. P0-E — SEO intelligence validation

### P0-E1 — Detector contracts and regression suite

- **Status:** In progress
- **Dependencies:** P0-B4, P0-A2
- **Tasks:**
  - [ ] Document every detector using the contract in `docs/seo-methodology/DETECTOR-SPECIFICATION.md`.
  - [ ] Version detector algorithms, thresholds, scoring, evidence schema, and known limitations.
  - [ ] Add synthetic fixtures, expected evidence, false-positive cases, and regression tests for each detector.
  - [ ] Validate representative real-site cases with privacy-safe fixtures and record precision/false-positive review.
  - [ ] Ensure LLM only explains/strategizes after deterministic detection; version model/prompt/scoring and validate structured output.
- **Acceptance:** Each production detector has deterministic test evidence and recommendations carry detector/scoring/model/prompt version metadata.

## 9. P1 — Agency collaboration and reporting

### P1-F1 — Team, client role, and collaboration

- **Status:** Not started
- **Dependencies:** P0-D1, P0-C5
- **Tasks:**
  - [ ] Complete role management, invitations, membership lifecycle, and role-change audit trail.
  - [ ] Add assignments, due dates, priorities, comments, mentions, and activity history.
  - [ ] Split internal notes from client-visible notes at schema, API, authorization, and UI levels.
  - [ ] Add approval requests/decisions with immutable audit history.
- **Acceptance:** Agency staff can collaborate while client users see only explicitly client-visible data.

### P1-F2 — Reports and client delivery

- **Status:** Not started
- **Dependencies:** P0-B4, P0-C5, P1-F1
- **Tasks:**
  - [ ] Define report data contracts for completed work, observed changes, outcomes, next opportunities, and owners.
  - [ ] Build period comparison, annotations, branding, preview, client-safe view, export, and scheduled delivery.
  - [ ] Store report metadata in PostgreSQL and generated artifacts in S3 with scoped access.
  - [ ] Add report generation retry, audit log, delivery health, and test fixtures.
- **Acceptance:** A client receives a tenant-safe report that clearly distinguishes observed results from AI-generated interpretation.

## 10. P1 — Content and research workflow

### P1-G1 — Research through content lifecycle

- **Status:** Not started
- **Dependencies:** P0-B1, P0-B3, P0-C5, P0-E1
- **Tasks:**
  - [ ] Implement keyword → cluster → topic → intent → gap → topic-map workflow from real data.
  - [ ] Add content inventory and existing-content optimization tied to URLs and performance observations.
  - [ ] Complete planner/calendar, briefs, approvals, published URL, performance monitoring, and refresh recommendations.
  - [ ] Enforce AI Gateway-only access, structured output validation, prompt/model versioning, quotas, and cost attribution.
- **Acceptance:** Content work is traceable from evidence to approved brief to published outcome; AI never fabricates volume, rankings, or traffic.

### P1-G2 — Competitor intelligence and exports

- **Status:** Not started
- **Dependencies:** P0-B3, P0-B4
- **Tasks:**
  - [ ] Define competitor configuration/ownership and data provider/legal constraints.
  - [ ] Build competitor visibility, keyword-gap, gain/loss, and content-gap views with freshness labels.
  - [ ] Add exports/imports with authorization, audit records, rate limits, and S3 artifact retention.
- **Acceptance:** Competitor insights are based on recorded observations with clear source/date/country/device metadata.

## 11. P2 — Commercial and pilot operations

### P2-H1 — Subscription, entitlements, and usage

- **Status:** Not started
- **Dependencies:** P0-D6, P1-F1
- **Tasks:**
  - [ ] Model subscription state, entitlements, trials, and workspace limits in PostgreSQL.
  - [ ] Enforce quotas server-side for users, projects, pages, keywords, syncs, SERP calls, AI, reports, and exports.
  - [ ] Build usage/cost dashboard and alerts; add auditable manual support overrides.
- **Acceptance:** Limits are enforced before spend/work is created and users see current usage plus next reset/limit state.

### P2-H2 — Admin and support operations

- **Status:** Not started
- **Dependencies:** P0-D1, P0-D4, P0-D6, P2-H1
- **Tasks:**
  - [ ] Put admin behind Cloudflare Access plus application RBAC.
  - [ ] Build support workflows for tenant lookup, integration health, failed-job retry, usage review, and feature flags without exposing secrets.
  - [ ] Add break-glass access policy, audit logging, and time-bounded privileged actions.
- **Acceptance:** Support can resolve common operational incidents with least privilege and a complete audit trail.

### P2-H3 — Pilot beta and product validation

- **Status:** Not started
- **Dependencies:** all P0 release gates
- **Tasks:**
  - [ ] Define pilot agency eligibility, support owner, feedback cadence, and rollback/exit criteria.
  - [ ] Instrument activation, time-to-first-value, weekly active workspace, action acceptance/completion, report delivery, retention, and gross margin signals.
  - [ ] Run staged rollout behind feature flags; triage blockers before adding P3 features.
  - [ ] Record user validation decisions and update this plan with evidence.
- **Acceptance:** Pilot evidence demonstrates safe recurring workflow use and identifies measured commercial blockers.

## 12. P3 — Explicitly deferred work

- **Status:** Deferred pending pilot evidence
- [ ] Backlink provider/index integration.
- [ ] CMS integrations.
- [ ] Autonomous-but-approved automations.
- [ ] Advanced forecasting and AI visibility.
- [ ] Enterprise SSO, custom domains, dedicated search/vector infrastructure.
- [ ] Kafka, Kubernetes, new microservices, or a search cluster without an Accepted ADR, benchmark, operational justification, cost analysis, migration, rollback, and human approval.

## 13. Operating contracts and measurable controls

### SEO measurement contract

Every recommendation, action outcome, or customer-facing impact claim must record:

| Field | Requirement |
|---|---|
| Entity and scope | Workspace, project, URL/query/keyword/template, country, device, search engine/provider where applicable |
| Observation source | GSC, crawl, SERP provider, GA4, or another approved source; include collection time and freshness state |
| Baseline and comparison | Explicit date windows, aggregation method, and sufficient sample size for the claim |
| Metric definition | Exact numerator/denominator, filters, attribution logic, and whether the value is observed or derived |
| Confounders | Releases, annotations, seasonality, tracking outage, indexation changes, campaign changes, and known missing data |
| Confidence | `High`, `Medium`, or `Low`, based on source coverage, freshness, variance, and confounders |
| Decision | Continue, investigate, pause, roll back, or record as inconclusive; no false causal claim |

Default wording must be “associated with” or “observed after” unless a documented causal method supports a stronger statement.

### Detector and scoring contract

A detector is production-eligible only when it has a versioned contract containing:

- Identifier, owner, user decision, input tables/artifacts, workspace/project scope, and freshness requirement.
- Deterministic algorithm, threshold/weights, algorithm version, evidence schema, severity, and confidence rules.
- Expected-positive, false-positive, no-data, stale-data, and partial-data fixtures with regression tests.
- Human review guidance, known limitations, suppression/deduplication behavior, and action mapping.
- Change history for algorithm, score, prompt, model, or evidence schema. AI may explain a detector result only after deterministic evidence exists.

The canonical detailed template remains `docs/seo-methodology/DETECTOR-SPECIFICATION.md`; every production detector must link to its completed instance.

### External workload contract

Crawl, GSC, SERP/provider, report, export, and AI workloads must define before release:

| Control | Required behavior |
|---|---|
| Identity and traceability | Workspace/project, actor or trigger, correlation ID, schema version, and idempotency scope travel through API, queue, worker, and persisted result |
| Validation | Server-side authorization; request/schema validation; SSRF and URL restrictions where outbound network access exists |
| Cost control | Server-side quota, rate limit, budget, concurrency cap, and immediate system/project kill switch before external spend/work begins |
| Retry policy | Explicit retryable/non-retryable error taxonomy, bounded attempts, backoff/jitter, timeout, and retry-safe idempotency behavior |
| Failure lifecycle | `queued → active → retrying → failed → dead-lettered → authorized replay → resolved`; persistent failure state and audit event are mandatory |
| Data integrity | Raw artifact retention where applicable, normalized-write idempotency, no destructive overwrite of historical observations, and reprocessing policy |
| Operations | Structured safe logs, metrics, trace/error event, alert threshold, named runbook, and least-privilege replay/override control |

### Initial service-level objectives

These are initial staging/pilot targets. Baselines must be recorded before tightening them; a target is not evidence of current performance.

| Service signal | Initial target | Error budget / escalation |
|---|---|---|
| API availability | ≥ 99.5% monthly for authenticated API health | Page on sustained 5xx/health failure; record tenant impact |
| API latency | p95 < 1.0 s for non-export, non-AI synchronous endpoints | Investigate at two consecutive 15-minute windows above target |
| Queue recovery | 95% of retryable jobs resolve within configured retry window | Alert on growing queue age, retry exhaustion, or dead-letter event |
| Crawl safety | 100% of prohibited URL/IP/DNS/redirect tests blocked in CI | Release-blocking on any regression |
| Crawl/SERP provider success | ≥ 95% successful eligible requests per 24 h, excluding explicit quota/invalid target denials | Alert per provider/workspace on breach; pause spend if failure pattern persists |
| Source freshness | Each UI source shows its declared freshness window; stale source never appears current | Alert when freshness SLA is breached; degrade decision confidence/UI |
| Detector quality | Every release has passing regression fixtures; false-positive review is recorded for pilot samples | Block detector rollout when evidence/fixtures are missing |
| Cost safety | 100% of paid workloads checked against quota/budget/kill switch before dispatch | Release-blocking on bypass; alert at warning and hard-limit thresholds |

## 14. Pilot charter and release ownership

### Pilot definition

Before Commercial Beta, record a short pilot charter in this section:

| Field | Required decision |
|---|---|
| Ideal customer profile | Agency or in-house profile, market/language, website types, expected projects/pages/keywords, and decision-maker role |
| Cohort | Small named cohort size, eligibility criteria, exclusions, test workspace policy, and consent/data-handling requirements |
| Success hypothesis | Target time-to-first-verified-insight, insight-to-action rate, action completion, data freshness, support load, and cost envelope |
| Support model | Named owner, response expectation, escalation route, incident communication, and feedback cadence |
| Rollout control | Feature flags, staged enablement, workload budgets, rollback trigger, and customer communication plan |
| Exit decision | Expand, hold, iterate, or roll back based on recorded evidence; no expansion solely because features were shipped |

### Release authority matrix

| Activity | Required authority | Required evidence |
|---|---|---|
| Production migration | Engineering owner plus reviewer; explicit approval for destructive/risky change | Migration review, backup/repair plan, rollout and rollback notes |
| Feature-flag enablement | Product owner plus Engineering owner; SEO owner for detector/decision features | Staging evidence, tenant scope, monitoring, rollback switch |
| Provider/workload quota override | Authorized Operations/Admin role; no client-side bypass | Audit record, reason, time limit, approver, cost impact |
| Failed-job replay | Authorized Operations/Admin role and owning workspace scope | Persistent failure record, idempotency check, audit event, runbook action |
| Detector/scoring/model release | SEO owner plus Engineering owner | Versioned contract, regression results, privacy-safe evaluation, rollback path |
| Pilot cohort expansion | Product, SEO, Engineering, and Operations owners | Gate evidence, cost/reliability review, support capacity, rollback decision |
## 15. Release gates

### Internal staging gate

- [ ] P0-A1 through P0-A3 complete.
- [ ] At least one end-to-end real-data path per source (GSC, crawl, SERP) works in staging with source/freshness evidence.
- [ ] Tenant/RBAC negative test suite passes and cross-tenant job replay is denied.
- [ ] Workload contract controls are verified: quota, kill switch, retry taxonomy, persistent failure/dead-letter workflow, and authorized replay audit trail.
- [ ] Health/readiness, safe logs, traces/errors, metrics, queue alerts, SLO dashboards, and on-call runbooks are verified.
- [ ] Backup and restore drill passed in an isolated environment with tenant data-integrity evidence.

### Commercial Beta gate

- [ ] P0-B through P0-E complete with evidence and all required status transitions recorded.
- [ ] Onboarding reaches first verified insight/action within the pilot charter target time-to-first-value.
- [ ] Site Audit, Rank Tracker, Settings, and Action Center have real data, error/empty/loading/stale states, responsive UI, and E2E coverage.
- [ ] Customer-facing claims follow the SEO measurement contract and label observed, derived, and AI-generated content correctly.
- [ ] Cost quotas/kill switches prevent uncontrolled crawler, SERP, and AI spend; pilot cost envelope is reviewed.
- [ ] Admin/support workflow, incident/release runbooks, authorized replay, and rollback controls are rehearsed.
- [ ] Pilot charter, rollout owner, and evidence-based expand/hold/rollback decision are approved.

## 16. Product roadmap after P0 evidence

The following phases define direction only. They do not mark work complete and may begin only when their listed P0 dependencies and release evidence are satisfied.

### Phase 1 — SEO Decision Operating System

Build a role-aware daily decision workflow from validated observations: Command Center, Page Intelligence, historical crawl/deployment diff, explainable opportunity and cannibalization scoring, and deterministic internal-link intelligence. Each insight must carry source, time window, freshness, confidence, scoring/detector version, and a link to a concrete action.

### Phase 2 — Agency collaboration and outcome measurement

Extend Action Center with assignments, approvals, internal/client-visible separation, comments, annotations, before/after outcome measurement, and tenant-safe client reporting. This maps to P1-F1 and P1-F2.

### Phase 3 — Research-to-content workflow

Deliver keyword universe, SERP-backed clustering, intent, keyword-to-URL mapping, content gap, content inventory, briefs, approvals, published URL tracking, and refresh measurement. This maps to P1-G1 and P1-G2 and must use provider-backed observations rather than invented demand metrics.

### Phase 4 — Commercial and pilot operations

Deliver server-side entitlements, usage/cost controls, least-privilege support operations, feature flags, pilot eligibility, feedback cadence, and measured rollout/rollback decisions. This maps to P2-H1 through P2-H3.

## 17. Canonical references

Keep these technical-control documents alongside this plan; they are not duplicate task lists:

- `docs/architecture/ARCHITECTURE-SPEC-v1.0.md`
- `docs/architecture/SECURITY-TOPOLOGY.md`
- `docs/architecture/DATA-OWNERSHIP.md`
- `docs/architecture/TECHNOLOGY-BASELINE.md`
- `docs/architecture/ADR-POLICY.md`
- `docs/adr/`
- `docs/runbooks/`
- `tests/TEST-MATRIX.md`

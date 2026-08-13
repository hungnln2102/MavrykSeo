# Local Development Runbook

## Prerequisites

- Node.js 20+ and pnpm `11.21.0`.
- Docker Desktop with Docker Compose v2.
- Go and Python only when starting the crawler, collector, or AI service outside Docker.
- Never use production credentials locally.

## Bootstrap a clean local environment

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm local:up
pnpm db:migrate
pnpm db:check
$env:DEMO_SEED_CONFIRMATION = 'seed-demo' # PowerShell only
pnpm db:seed
pnpm dev
```

On Windows PowerShell, copy the environment template with:

```powershell
Copy-Item .env.example .env
```

Local service endpoints:

- PostgreSQL: `localhost:5435`
- ClickHouse HTTP: `localhost:8123`
- Redis: `localhost:6379`
- MinIO API: `localhost:9002`; console: `localhost:9001`
- API: `localhost:3000`; Web: `localhost:3001`; Admin: `localhost:3002`

## Database workflow

- `pnpm db:generate` creates a deterministic Drizzle migration after reviewing schema changes.
- `pnpm db:migrate` applies checked-in, forward-only migrations. It requires `DATABASE_URL`.
- Legacy local databases that were created before Drizzle migration tracking can be bootstrapped safely with `pnpm db:migrate`; additive migrations use `IF NOT EXISTS` and do not delete customer or historical data. Do not repair staging/production migration history manually—escalate with a backup and migration review instead.
- `pnpm db:check` validates Drizzle migration metadata before review or release.
- `pnpm db:seed` creates or updates only the fixed demo user/workspace/project/site. It refuses production mode and requires `DEMO_SEED_CONFIRMATION=seed-demo`.
- Use `pnpm --filter @seo/db run db:push` only for disposable local exploration; never use it for staging or production.
- Do not edit production schemas manually and do not change/delete historical SEO data without explicit approval.

## Local checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm test` is the deterministic suite and currently includes API RBAC unit tests. The worker detector verification needs the Python AI service and mocked external data; run it only in an isolated integration environment:

```bash
pnpm test:integration
```

## Shutdown and cleanup

```bash
pnpm local:down
```

This stops containers but preserves named volumes. Removing volumes deletes local data and must be an explicit, deliberate action.

## Migration smoke check

Run `pnpm db:migrate` twice after `pnpm local:up` completes. The first run applies pending migrations; the second must complete without changes. On 2026-08-13 this passed against the local Docker PostgreSQL volume. Record future results in release evidence. A fresh-volume verification requires an isolated Docker Compose project or manually created disposable database; never reset shared/staging data to test migrations.
## Local secret configuration

- Copy `.env.example` to `.env`; use only disposable local credentials.
- Set `JWT_SECRET` for any local API session shared outside a single developer machine.
- Set `GSC_TOKEN_ENCRYPTION_KEY` (or the backward-compatible `ENCRYPTION_KEY`) before saving or reading integration credentials. Use a random 32-byte value encoded as 64 hexadecimal characters.
- Never copy a staging or production encryption key into local `.env`; data encrypted with one environment key must remain in that environment.
- The API permits a local JWT fallback only when `NODE_ENV` is not `production`. Credential encryption never has a fallback key.

## Crawl safety controls

- Set `CRAWL_KILL_SWITCH=true` and restart the API and worker to stop new crawl dispatches and prevent queued jobs from making outbound crawler requests.
- Restore `CRAWL_KILL_SWITCH=false` only after the incident owner verifies the target, provider, quota/budget, and tenant impact.
- Workspace and project policies are stored in PostgreSQL. `crawl_enabled=false` blocks that scope; `crawl_max_concurrent_jobs` caps queued plus active crawl jobs before queue dispatch. A project cap inherits the workspace cap when it is `NULL` and can only lower the effective limit.
- Apply `pnpm db:migrate` before using the policy columns introduced by migration `0009_gigantic_reptil.sql`.

## Crawler outbound policy

- Production is fail-closed: set `CRAWLER_OUTBOUND_ALLOWLIST` to approved exact hostnames or `*.example.com` patterns before starting the crawler.
- Set `CRAWLER_CIRCUIT_FAILURE_THRESHOLD` and `CRAWLER_CIRCUIT_COOLDOWN` to control the per-host breaker. Defaults are `5` consecutive failures and `1m` cooldown.
- Investigate structured crawler logs with `outbound_event`; they intentionally include only normalized hostnames and safe reason codes, never paths, query strings, or URL credentials.

## Scheduled crawls

- Set a site's cadence with `POST /sites/:siteId/crawl-schedule` and a `crawlScheduleMinutes` value of at least `60`; set it to `null` to disable that site's schedule.
- The API scheduler is disabled by default. Enable it only in one approved scheduler/API deployment with `CRAWL_SCHEDULER_ENABLED=true`; `CRAWL_SCHEDULER_TICK_MS` defaults to `60000`.
- Each site cadence is dispatched with a deterministic execution-window key. Multiple ticks or API instances cannot enqueue more than one crawl run for the same site/window because `job_runs` has a workspace/idempotency uniqueness constraint.
- Scheduled crawls still pass the same tenant policy, quota/concurrency, kill-switch, queue retry, and ingestion-fence controls as a manual crawl.

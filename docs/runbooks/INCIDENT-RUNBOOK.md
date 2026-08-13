# Incident Runbook

## SEV-1

-   data breach
-   cross-tenant exposure
-   major corruption
-   widespread outage

## Required Flow

Detect → Assign owner → Contain → Recover → Communicate → Preserve
evidence → Root cause → Corrective actions

Không xóa log/evidence trong incident.

## Dead-letter job recovery

Use this flow for a crawl, rank, SERP, report, export, GSC, or AI workload that exhausts its retry policy or fails with a non-retryable error.

1. Confirm the alert from `job_dead_letter_total` and identify queue, job name, error code, correlation ID, and affected workspace from safe logs/traces.
2. Confirm whether the error is retryable in practice. Do not replay invalid payload, tenant-scope violation, invalid target, or authentication failures until the root cause is corrected.
3. Verify provider status, quota/budget, workspace/project ownership, source freshness, and any feature-flag/kill-switch state before causing new spend.
4. An `owner` or `admin` for the active workspace may inspect redacted records with `GET /jobs/failed` and replay only the intended record with `POST /jobs/:jobRunId/replay`. The replay creates a new correlation and idempotency identity while retaining lineage to the dead-letter record.
5. Verify the replay reaches `completed` in `job_runs`, check the downstream raw/normalized result, and record the customer/data impact in the incident.
6. Escalate when dead-letter volume grows, a provider failure affects multiple workspaces, a quota bypass is suspected, or tenant isolation is involved. Pause the relevant workload with the kill switch before broad replay.

Never copy stored payloads into tickets, logs, or AI tools. Preserve the dead-letter record and audit trail; do not delete it to silence an alert.

## Emergency crawl pause

1. Set `CRAWL_KILL_SWITCH=true` in the deployment environment and restart the API and worker. This blocks new dispatches and prevents queued jobs from issuing outbound crawler requests.
2. Record the incident ID, initiating operator, affected workspaces/projects, reason, and time in the incident evidence. Do not use a client-side control as a substitute.
3. Check `job_runs` for queued or active crawl jobs. Do not replay them until the root cause, quota/budget, target safety, and tenant scope have been verified.
4. After remediation, set `CRAWL_KILL_SWITCH=false`, restart the affected services, and verify one authorized crawl completes before returning to normal volume.

## Outbound policy or circuit event

1. Inspect the crawler `outbound_event` records by normalized hostname and safe reason code (`policy`, `timeout`, `transport`, `upstream_5xx`, or `circuit_open`); do not search for or record full request URLs.
2. For a policy denial, validate public-target ownership and explicit approval before adding an exact hostname or a narrowly scoped wildcard to `CRAWLER_OUTBOUND_ALLOWLIST`. Never allow private/internal targets.
3. For repeated failures, let the per-host breaker cool down or use the system crawl pause while investigating target availability and budget impact. Do not repeatedly replay jobs to bypass the breaker.
4. Re-enable normal volume only after an authorized target succeeds and the incident evidence records the policy change or root cause.

## Scheduled crawl overload

1. Set `CRAWL_SCHEDULER_ENABLED=false` or use `CRAWL_KILL_SWITCH=true` for an immediate wider pause; restart the API scheduler deployment after changing environment configuration.
2. Confirm each impacted site has an approved cadence of at least 60 minutes and reduce or clear `crawlScheduleMinutes` for nonessential sites before resuming.
3. Verify no queue/concurrency/quota controls were bypassed. Repeated scheduler ticks must reuse the same execution-window identity rather than creating a second run.

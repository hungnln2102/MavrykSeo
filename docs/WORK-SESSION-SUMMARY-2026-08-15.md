# Work session summary — 2026-08-15

## Completed in this session

- Started Docker Desktop and applied PostgreSQL migration `0012_add_gsc_oauth_states` successfully to the local Docker database.
- Implemented GSC OAuth authorization at `apps/api/src/integrations/gsc-oauth.service.ts` with the minimum read-only scope, PKCE S256, and a random opaque OAuth state.
- Persisted only the SHA-256 hash of the OAuth state in PostgreSQL. The PKCE verifier is encrypted at rest and the state is atomically marked consumed before the token exchange, preventing replay.
- Enforced project-to-workspace ownership when beginning OAuth authorization.
- Added protected authorization and unauthenticated Google callback routes at `apps/api/src/integrations/gsc-oauth.controller.ts`.
- Prevented public integration reads from returning decrypted credentials. `GET /projects/:projectId/integrations/:provider` now returns metadata only; server-side services use `getIntegrationCredentials` when needed.
- Added owner/admin property-selection APIs: `GET /projects/:projectId/integrations/google-search-console/properties` lists only authorized property URLs and permission levels; `PUT /projects/:projectId/integrations/google-search-console/property` accepts only a property Google authorizes and keeps the selection encrypted with the credentials.
- Added the typed `GscSyncJobData` contract with mandatory workspace/project scope, selected property, ISO date range, correlation/idempotency fields, and a validator/fixture in `packages/seo-core`.
- Updated `docs/PROJECT-EXECUTION-PLAN.md`: P0-B1 is now in progress, and the encrypted-token task is checked complete.

## Validation completed

- `pnpm --filter api test -- --runTestsByPath src/integrations/gsc-oauth.service.spec.ts src/integrations/integrations.service.spec.ts` — 10 tests passed.
- `pnpm --filter api typecheck` — passed.
- `pnpm --filter api build` — passed.
- `pnpm --filter @seo/db typecheck` — passed.
- Local `pnpm db:migrate` — migration applied successfully; verified `gsc_oauth_states` with the expected foreign keys and indexes through the PostgreSQL container.

## Continue from here

P0-B1 is **not done** yet and must not be checked complete. Implement the remaining vertical slice in this order:

1. Add a typed GSC sync job and worker. Refresh tokens server-side; add backfill and incremental Search Analytics queries with idempotency, quota limits, retry/backoff, and partial-failure handling.
2. Store immutable raw GSC responses in `raw/gsc/...` on S3, write normalized daily observations to ClickHouse, and persist safe sync status/freshness/errors in PostgreSQL.
3. Expose connection and sync health to the API/UI, then run a real pilot property through initial and repeat incremental syncs without duplicate facts.
4. Add provider sandbox/token refresh/revoke/reconnect tests. Only after the pilot acceptance evidence is repeatable should P0-B1 be ticked complete.

## Pilot evidence — August 15, 2026

- Google OAuth consent completed with a Search Console `siteOwner`; selected property: `sc-domain:mavrykpremium.com`.
- Initial backfill (`2026-07-14` through `2026-08-06`) and incremental sync (`2026-08-08` through `2026-08-12`) both completed; status stores last-success timestamp, requested range, and safe health fields.
- A broader backfill (`2025-08-15` through `2026-08-12`) also completed. Raw immutable artifacts were verified in MinIO at `raw/gsc/{workspaceId}/{projectId}/{ingestionKey}/search-analytics.json`.
- Re-dispatching the exact broad range returned `duplicate: true`, `queued: false`, and preserved the completed status. This also fixed a discovered bug where duplicate dispatches previously overwrote status with `queued`.
- Google returned zero query and page rows for all tested date ranges. ClickHouse has zero duplicates, but this is not sufficient evidence for non-empty GSC fact persistence. Re-run the pilot with a property/date range known to have Search Analytics data.

## Security reminder

The Google OAuth client secret was shared in the conversation during setup. Rotate that secret in Google Cloud after the local implementation/pilot test, then update the ignored local `.env`; never add it to Git.

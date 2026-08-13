# Release Runbook

## Flow

`PR → lint → typecheck → deterministic tests → build → security checks → staging → integration smoke → production`

## Required pre-release evidence

- [ ] `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass in CI.
- [ ] The migration is reviewed, forward-only, and checked with `pnpm db:check`.
- [ ] Staging migration was applied using `pnpm db:migrate`; rollback/repair owner is named.
- [ ] Backup-before-migrate and restore evidence exist for any persistent-data change.
- [ ] Risky behavior is behind a feature flag or staged rollout with rollback path.
- [ ] Observability, health/readiness, error tracking, and relevant dashboards are active.
- [ ] Tenant authorization, secret handling, quotas, and provider-side spend controls were reviewed.
- [ ] Release owner completes post-deploy smoke checks and records the result.

## Migration safety

- Never use `db:push` against staging or production.
- Do not modify an already-applied migration; create a new deterministic forward migration.
- Stop the release when migration state differs from the repository journal or backup status is unknown.
- If rollback requires data repair rather than code rollback, follow the incident runbook and preserve evidence.
## Secret configuration and rotation

- Store staging and production values in the approved platform secret manager; do not commit them, place them in images, or print them in CI logs.
- Before startup, production must provide `JWT_SECRET` and `GSC_TOKEN_ENCRYPTION_KEY` (or `ENCRYPTION_KEY`). The API now fails closed when either required secret is absent.
- Use independent secrets for local, staging, and production. Restrict read access to the runtime identity and the approved break-glass process.
- Rotate JWT and credential-encryption keys through an approved migration plan: preserve the prior encryption key in restricted recovery storage, decrypt and re-encrypt affected records in a controlled job, validate reads, then revoke the prior key.
- Stop and investigate any authentication, decryption, or audit event that could expose a credential. Audit metadata must record field names only, never values.
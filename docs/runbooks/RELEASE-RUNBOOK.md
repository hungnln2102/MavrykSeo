# Release Runbook

Flow:
`PR → lint → typecheck → tests → build → security checks → staging → smoke → production`

Production release yêu cầu: - migration reviewed - feature flags cho
risky changes - observability active - rollback path - owner -
post-deploy verification

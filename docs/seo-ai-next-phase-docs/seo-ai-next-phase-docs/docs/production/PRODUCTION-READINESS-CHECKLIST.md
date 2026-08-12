# Production Readiness Checklist

## Security

-   [ ] Tenant isolation tests
-   [ ] RBAC tests
-   [ ] OAuth token encryption
-   [ ] Secret manager
-   [ ] Crawler SSRF controls
-   [ ] Rate limits
-   [ ] Cloudflare WAF rules
-   [ ] Cloudflare Tunnel/origin isolation
-   [ ] Cloudflare Access cho admin/internal
-   [ ] Webhook signature verification
-   [ ] Dependency/container scanning
-   [ ] Audit logging

## Reliability

-   [ ] Health/readiness endpoints
-   [ ] Graceful shutdown
-   [ ] Job retry/backoff
-   [ ] Dead-letter/failure workflow
-   [ ] Idempotency
-   [ ] DB migration procedure
-   [ ] Backup
-   [ ] Restore test
-   [ ] Resource limits
-   [ ] Kill switches

## Observability

-   [ ] OpenTelemetry traces
-   [ ] Sentry errors
-   [ ] Prometheus metrics
-   [ ] Grafana dashboards
-   [ ] Correlation IDs
-   [ ] Queue health
-   [ ] GSC sync lag
-   [ ] Crawl success
-   [ ] SERP collection success
-   [ ] AI cost/project
-   [ ] SERP cost/project

## Product

-   [ ] Empty/loading/error states
-   [ ] Last sync/data freshness
-   [ ] Usage/quota feedback
-   [ ] Permission-aware UI
-   [ ] Onboarding
-   [ ] Client role
-   [ ] Report workflow

## Commercial

-   [ ] Subscription state
-   [ ] Entitlements
-   [ ] Usage metering
-   [ ] Trial limits
-   [ ] Terms/Privacy
-   [ ] Support/admin workflow

# Production Topology

## Baseline

``` text
Internet
  ↓
Cloudflare
  ↓
Cloudflare Tunnel
  ↓
Ingress
  ├── web
  └── api
       ↓
Internal network
  ├── worker
  ├── ai
  ├── crawler (isolated)
  ├── collector (isolated)
  ├── redis
  ├── postgres
  ├── clickhouse
  └── object storage
```

## Rules

-   App containers stateless.
-   DB/Redis/ClickHouse không public Internet.
-   Persistent volumes/backups tách khỏi app lifecycle.
-   Health/readiness endpoints.
-   Graceful shutdown.
-   Resource limits.
-   Non-root containers.
-   Multi-stage builds.
-   Read-only filesystem khi phù hợp.
-   No Docker socket mount.

## Environments

-   local
-   test
-   staging
-   production

Staging tách DB và credentials khỏi production.

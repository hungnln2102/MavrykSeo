# SEO AI Commercial Platform

Production-oriented SEO & Content Marketing Operating System dành cho
SEO Agency, Content Marketing Agency và in-house teams.

## Architecture Baseline v1.0

-   Web: Next.js + TypeScript
-   Core API: NestJS + Fastify + TypeScript
-   AI/Data Intelligence: Python + FastAPI/Pydantic
-   Crawlers/Collectors: Go
-   OLTP: PostgreSQL
-   ORM: Drizzle ORM
-   OLAP/Historical: ClickHouse
-   Vector: pgvector
-   Cache/Jobs: Redis + BullMQ
-   Raw Data: S3-compatible Object Storage
-   Auth: Better Auth
-   Edge Security: Cloudflare
-   Origin: Cloudflare Tunnel
-   Internal/Admin: Cloudflare Access
-   Observability: OpenTelemetry + Sentry + Prometheus/Grafana
-   Containers: Docker
-   Local: Docker Compose
-   IaC: OpenTofu/Terraform
-   CI/CD: GitHub Actions
-   Repository: pnpm + Turborepo monorepo

## Product Goal

`Data → Detect → Explain → Prioritize → Action → Collaborate → Verify → Measure → Learn`

Mục tiêu là xử lý/quản lý được 85--95% workflow lặp lại của một
SEO/Content Agency, không phải clone Semrush.

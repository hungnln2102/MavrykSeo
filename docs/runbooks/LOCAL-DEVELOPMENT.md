# Local Development Runbook

Target bootstrap:

``` bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm dev
```

Local dependencies: - PostgreSQL - ClickHouse - Redis - MinIO (S3
compatible) - mail test service nếu cần

Không dùng production credential ở local.

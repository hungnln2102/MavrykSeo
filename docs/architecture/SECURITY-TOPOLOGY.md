# Security & Network Topology

## 1. Defense in Depth

1.  Cloudflare Edge
2.  Origin protection
3.  Identity
4.  Application authorization
5.  Workload isolation
6.  Data security
7.  Detection/observability

## 2. Public Flow

`Internet → Cloudflare DNS/CDN/DDoS/WAF/Rate Limit → Cloudflare Tunnel → Web/API`

Origin không cần public inbound.

## 3. Internal/Admin

Admin UI, Grafana và internal tools đặt sau Cloudflare Access +
application auth/RBAC.

## 4. Logical Zones

### EDGE

Cloudflare.

### INGRESS

cloudflared / reverse proxy.

### APPLICATION

web/api.

### WORKLOAD

worker/AI/crawler/collector.

### DATA

PostgreSQL/ClickHouse/Redis/Object Storage.

## 5. Crawler Isolation

Crawler là semi-untrusted compute: - outbound Internet: yes - direct DB
access: avoid - private/internal CIDRs: blocked - cloud metadata:
blocked - redirects: revalidated - protocols: allowlist HTTP/HTTPS -
response size/time/concurrency limits

## 6. Secrets

Production dùng secret manager. Không commit `.env`. Token/refresh token
mã hóa at rest; encryption key ngoài DB.

## 7. API Security

-   validation
-   server-side authorization
-   tenant scoping
-   rate limiting
-   audit
-   webhook signature verification
-   idempotency cho write operation phù hợp

## 8. Cloudflare

Dùng: - DNS - CDN - DDoS protection - WAF managed/custom rules - rate
limiting - bot controls - Tunnel - Access cho internal/admin

Cloudflare không thay thế application security.

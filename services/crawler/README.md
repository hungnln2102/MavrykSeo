# services/crawler

Go HTTP crawler for controlled outbound SEO crawling. It has no PostgreSQL client or database credentials; the worker owns business state and stores observations.

## Security boundaries

- Accepts only HTTP/HTTPS URLs with a hostname and no URL credentials.
- Rejects localhost, private, link-local, loopback, multicast, and unspecified IP targets.
- Revalidates redirect destinations and resolves hostnames again at dial time.
- Limits request bodies to 8 KiB, crawl responses to 5 MiB, sitemap responses to 10 MiB, redirects to 10, and network/server timeouts.
- Requires `CRAWLER_OUTBOUND_ALLOWLIST` in production; supports exact hostnames and `*.example.com` subdomain patterns. An empty allowlist is permitted only outside production.
- Opens an in-memory per-host circuit after `CRAWLER_CIRCUIT_FAILURE_THRESHOLD` consecutive transport/timeout/upstream-5xx failures and resets after `CRAWLER_CIRCUIT_COOLDOWN`.
- Emits structured `outbound_event` logs with only the normalized hostname and a safe reason code; URL paths, query parameters, and credentials are excluded.
- Returns generic outbound failures so URL credentials or internal network details are not reflected in API responses.

## Verification

Run the SSRF and response-limit corpus locally:

```bash
cd services/crawler
go test ./...
go vet ./...
go build ./...
```

Do not give this service direct production database credentials. Use the worker service boundary for persisted work and tenant validation.

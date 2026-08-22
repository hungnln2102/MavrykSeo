# ADR-016: SERP Provider Contract & Ingestion Safety

## Status
Accepted

## Context
Google Search Results Page (SERP) data is highly dynamic, requiring localization (regions/countries), device segmentation (mobile vs desktop), and language settings. In order to scale rank collection, Mavryk SEO requires a standard interface contract for any upstream SERP provider (e.g. Value SERP, Serper.dev, or DataForSEO) and robust safety controls to manage crawler costs, billing limits, and failures.

## Decision
We establish the following standard contract constraints and implementation specifics:

### 1. Provider Parameters
- **Regions/Countries**: Query parameter mapping to standard ISO country codes (e.g., `us` for United States, `vn` for Vietnam). Mapped to backend inputs.
- **Language**: Standard ISO 639-1 language codes (e.g., `en` for English, `vi` for Vietnamese).
- **Device**: Strictly partitioned between `desktop` and `mobile`.
- **Parsing features**: The engine must support parsing organic results, local packs, advertisements, featured snippets, and people also ask (PAA) boxes.

### 2. Failure Semantics & Retries
- **HTTP 403 (Invalid API Key / Unauthorized)**: Classified as an `UnrecoverableError`. BullMQ will immediately move the job to the Failed/Dead-Letter Queue without retry.
- **HTTP 429 (Rate Limit Exceeded)**: Retryable. Triggers exponential backoff (starting at 1 second, up to 3 attempts).
- **HTTP 500/503 (Provider Downstream Failure)**: Retryable. Triggers identical retry/backoff structure.

### 3. Costs and Limits Control
- **Dynamic Quotas**: Keyword tracking slots are restricted per Workspace Plan. The limits are read from the `system_configs` table in PostgreSQL:
  - `keyword_limit_free` (default: 999999 for test, adjustable)
  - `keyword_limit_pro` (default: 999999)
  - `keyword_limit_enterprise` (default: 999999)
- **Emergency Kill Switch (`SERP_KILL_SWITCH = true`)**: If set, all SERP crawler queue jobs and API sync triggers will bypass downstream calls immediately, resolving with warning details to avoid cost leakages.
- **Cost log metrics**: Recorded in Prometheus as `serp_queries_total` and `serp_cost_usd_total` (at $0.005 per query).

## Consequences
- Clean separation of provider-specific API payloads.
- Highly resilient background queue behavior preventing unnecessary retries.
- Runtime safety limits configurable instantly via PostgreSQL value settings.

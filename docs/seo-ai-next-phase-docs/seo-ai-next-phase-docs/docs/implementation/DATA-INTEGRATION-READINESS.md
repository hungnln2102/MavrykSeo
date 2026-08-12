# Data Integration Readiness

## Mục tiêu

Loại bỏ trạng thái UI đẹp nhưng dữ liệu rời rạc hoặc mock.

## Quy tắc

Production feature phải xác định rõ:
`Source → Ingestion → Raw → Normalize → Store → Derive → API → UI → Action`

## Data sources

### Google Search Console

-   OAuth scopes tối thiểu
-   property selection
-   initial backfill
-   incremental sync
-   freshness
-   quota handling
-   token refresh/revoke
-   sync health

### Crawler

-   crawl configuration
-   SSRF protection
-   rate/concurrency limits
-   raw artifacts
-   normalized page observations
-   detector execution

### SERP / Rank

-   provider contract
-   country/device
-   scheduling
-   retries
-   cost quota
-   historical observations

### User/Agency data

-   project/site settings
-   tracked keywords
-   competitors
-   business context
-   actions/tasks/comments

## UI data trust

Khi phù hợp, UI phải hiển thị: - source - date range - last synced -
freshness - confidence/estimate label

Không trình bày AI estimate như observed fact.

## Mock data

Mock/fixtures chỉ dùng test, Storybook hoặc demo có nhãn. Production
screens không được fallback im lặng sang fake metrics.

# Data Ownership & Storage Boundaries

## PostgreSQL --- Business State

-   users/accounts/sessions
-   workspaces/memberships
-   projects/sites
-   integrations metadata
-   encrypted OAuth credential records
-   keyword tracking configuration
-   content items/briefs
-   recommendations/actions/tasks/comments
-   reports metadata
-   subscriptions/entitlements/usage
-   audit records
-   feature flags/config

## ClickHouse --- Historical/Analytical Facts

-   gsc_query_daily
-   gsc_page_daily
-   gsc_query_page_daily
-   rank_observations
-   serp_snapshots
-   serp_results
-   crawl_page_observations
-   keyword_metric_history
-   domain_visibility_history
-   competitor_visibility_history
-   product_events

## S3-compatible Object Storage

-   raw/gsc
-   raw/crawl
-   raw/serp
-   raw/imports
-   processed
-   exports
-   reports
-   archive

## Redis

-   BullMQ jobs
-   cache
-   rate limits
-   short-lived locks/state

Redis không phải source of truth.

## Core Rule

PostgreSQL = trạng thái nghiệp vụ. ClickHouse = lịch sử quan sát/phân
tích. S3 = raw/reprocessable artifacts.

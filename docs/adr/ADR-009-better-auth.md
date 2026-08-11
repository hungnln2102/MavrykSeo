# ADR-009-better-auth --- Better Auth

## Status

Accepted

## Architecture Version

1.0

## Context

Dự án cần một baseline dài hạn, thương mại hóa được cho SEO/Content
Agency.

## Decision

Self-hosted application auth; GSC OAuth là integration riêng.

## Consequences

-   Giữ boundary rõ ràng.
-   Không được thay bằng preference cá nhân.
-   Thay đổi tương lai phải qua ADR + benchmark + operational
    justification.

## Review Trigger

Chỉ xem xét lại khi có bottleneck, cost, reliability, security hoặc
compliance requirement đo được.

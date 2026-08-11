# ADR-002-python-intelligence --- Python Intelligence Layer

## Status

Accepted

## Architecture Version

1.0

## Context

Dự án cần một baseline dài hạn, thương mại hóa được cho SEO/Content
Agency.

## Decision

Python dành cho NLP/ML/AI/data science, không thay core SaaS backend.

## Consequences

-   Giữ boundary rõ ràng.
-   Không được thay bằng preference cá nhân.
-   Thay đổi tương lai phải qua ADR + benchmark + operational
    justification.

## Review Trigger

Chỉ xem xét lại khi có bottleneck, cost, reliability, security hoặc
compliance requirement đo được.

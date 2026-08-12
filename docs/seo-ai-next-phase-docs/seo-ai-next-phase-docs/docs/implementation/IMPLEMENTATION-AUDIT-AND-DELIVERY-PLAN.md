# Implementation Audit & Delivery Plan

## Mục tiêu

Chuyển dự án từ trạng thái "architecture/backend foundation" thành một
sản phẩm Agency có thể sử dụng hằng ngày và tiến tới Commercial Beta.

## Nguyên tắc trạng thái feature

Mọi feature phải đi qua:
`SPECIFIED → DATA READY → BACKEND READY → FRONTEND READY → INTEGRATED → TESTED → PRODUCTION READY → VALIDATED BY USERS`

Không coi feature hoàn thành chỉ vì đã có API hoặc UI.

## Implementation Matrix

Mỗi module phải được audit theo các cột: - Product spec - Data source -
Database/schema - Ingestion/worker - Backend/API - Frontend -
RBAC/tenant isolation - Error/empty/loading states - Tests -
Observability - Production security - User validation

## Thứ tự triển khai

### P0 --- Core completion

1.  Site Audit
2.  Rank Tracker
3.  Settings
4.  GSC production integration
5.  Action Center cross-module integration

### P1 --- Agency workflow

6.  Team/RBAC
7.  Assignment/due dates/comments
8.  Internal vs client-visible notes
9.  Approval workflow
10. Client reporting

### P1 --- Content workflow

11. Keyword → cluster → topic
12. Content inventory
13. Planner/calendar
14. Brief
15. Existing content optimization
16. Publish/performance/refresh loop

### P2 --- Production readiness

17. Security hardening
18. Observability
19. Backup/restore
20. Billing/entitlements
21. Usage/cost controls
22. Admin console

### P3 --- Commercial Beta

23. Onboard pilot Agencies
24. Track activation/retention/action completion
25. Collect workflow gaps
26. Fix blockers before feature expansion

## Backlinks

Backlinks không phải P0. Ẩn khỏi production navigation hoặc hiển thị
Coming Soon rõ ràng. Chỉ ưu tiên khi pilot customers chứng minh đây là
blocker thương mại.

## Release gate

Không đưa module vào production nếu thiếu tenant authorization, error
handling, test tối thiểu, telemetry hoặc dữ liệu thật.

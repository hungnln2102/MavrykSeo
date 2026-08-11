# ADR + Benchmark + Operational Justification Policy

## ADR Required For

-   database
-   ORM
-   framework chính
-   auth
-   queue/event backbone
-   object storage
-   cloud/security model
-   observability
-   deployment/orchestration
-   microservice extraction
-   AI provider architecture
-   crawler implementation architecture

## Required Evidence

1.  measurable problem
2.  benchmark/PoC
3.  operational justification
4.  security impact
5.  cost impact
6.  migration plan
7.  rollback/exit strategy
8.  human approval

## Benchmark Threshold Guidance

Không đổi nền tảng chỉ vì 5--15% tốt hơn. Xem xét khi: - ≥2x ở
bottleneck quan trọng, hoặc - ≥30% cost reduction có ý nghĩa, hoặc -
stack hiện tại không đáp ứng requirement an toàn, hoặc -
reliability/security/compliance yêu cầu thay đổi.

## Operational Review

Đánh giá: - reliability - latency - throughput - cost - security -
maintainability - team complexity - deployment - backup/recovery - exit
strategy

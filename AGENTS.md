# AGENTS.md --- Luật làm việc cho AI Coding Agents

## 1. Source of truth

Thứ tự ưu tiên: 1. Code + migrations 2. Accepted ADR 3.
Architecture/Product specs 4. Issues/PRs 5. Chat chỉ là working context

## 2. Bắt buộc đọc trước khi code

-   `docs/architecture/ARCHITECTURE-SPEC-v1.0.md`
-   `docs/architecture/SECURITY-TOPOLOGY.md`
-   `docs/architecture/DATA-OWNERSHIP.md`
-   ADR liên quan
-   Product/SEO methodology liên quan task

## 3. Không tự thay core stack

Không được tự thêm/thay: - framework chính - database - ORM - auth -
queue/event backbone - cloud security model - observability stack -
deployment model - service boundary

trừ khi có **Accepted ADR + benchmark + operational justification +
human approval**.

## 4. Architecture Change Rule

Một thay đổi kiến trúc phải có: 1. Measurable problem 2. Reproducible
benchmark/PoC 3. Operational justification 4. Security impact 5. Cost
impact 6. Migration plan 7. Rollback/exit strategy 8. Human approval

Popularity, novelty hoặc preference không đủ.

## 5. Data rules

-   PostgreSQL = business state/source of truth.
-   ClickHouse = historical observations/analytics.
-   S3 = raw/reprocessable artifacts.
-   Redis = ephemeral cache/queue, không phải source of truth.
-   Không overwrite lịch sử SEO quan trọng.
-   Mọi customer data phải scoped workspace/project.
-   Phân biệt observed / derived / AI-generated.

## 6. Security rules

-   Không hard-code secret.
-   Không log token/password/API key.
-   Authorization server-side.
-   Không bypass tenant checks.
-   Crawler phải chống SSRF.
-   Không gửi secret/refresh token vào AI provider.
-   Destructive action cần explicit authorization.

## 7. AI rules

-   LLM chỉ qua AI Gateway.
-   Structured output + validation.
-   Không bịa search volume/ranking/traffic.
-   Deterministic rule trước LLM.
-   Model/prompt/scoring thay đổi phải version + evaluation.

## 8. Coding rules

-   TypeScript strict.
-   Explicit error handling.
-   Không swallow exception.
-   Không sửa file ngoài scope nếu không cần.
-   Không tạo abstraction nếu chưa có use case.
-   Business logic không được duplicate.

## 9. Testing

Trước khi báo hoàn thành: - lint - typecheck - relevant tests - build -
AI evaluation nếu behavior AI thay đổi

Không xóa test chỉ để CI xanh.

## 10. Database

-   Không sửa production schema thủ công.
-   Migration deterministic.
-   Không drop dữ liệu nếu chưa có explicit approval.
-   Query customer data phải tenant-scoped.

## 11. Production safety

-   Risky features dùng feature flag/staged rollout.
-   Có health checks, logs, metrics, rollback.
-   Không deploy destructive change nếu task không cho phép.

## 12. Cost

Mọi workload theo pages/keywords/SERP/AI phải có quota/rate
limit/budget/kill switch.

## 13. Definition of completion

Task chỉ hoàn tất khi code, tests, docs, migrations, permissions và
observability phù hợp đều hoàn thành.

## 14. Responsive rules

Khi chỉnh sửa giao diện cần phải responsive cho các phiên bản:
- Mobile
- Tablet
- PC
- Max-PC (màn hình trên 27 inch)
- Min-PC (màn hình dưới 24 inch)

## 15. Nguyên tắc cuối

Protect user data. Preserve history. Keep tenant isolation. Prefer
measurable SEO actions. Minimize unnecessary complexity.

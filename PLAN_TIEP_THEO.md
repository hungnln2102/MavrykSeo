# Kế Hoạch Triển Khai Tiếp Theo (Phase 4 --- Phase 8)
**Dự án: SEO AI Platform**

Tài liệu này tổng hợp toàn bộ các nhiệm vụ chưa thực hiện từ Phase 4 đến Phase 8 trong [TASK.md](file:///d:/Desktop/admin/SEO-Website/TASK.md), cung cấp kiến thức nền tảng và các hướng dẫn kỹ thuật chi tiết để bạn có thể tiếp tục tự triển khai tại nhà một cách dễ dàng.

---

## 📌 Tổng Quan Hiện Trạng Hệ Thống
Hệ thống hiện tại đã hoàn tất và kiểm thử thành công các Phase sau:
*   **Phase 0 (Audit & Clean):** Hoàn tất dọn dẹp các dead route. Tab *Backlinks* hiện hiển thị giao diện **Coming Soon (v1.1)** đẹp mắt, tránh tình trạng click vào tab bị trống màn hình.
*   **Phase 1 (Core Product):** Site Audit (Go crawler/collector + ClickHouse), Rank Tracker (BullMQ worker + ClickHouse), Settings & Cấu hình Project, Đồng bộ Google Search Console (GSC OAuth).
*   **Phase 2 (SEO Intelligence):** Framework Detector và các thuật toán phát hiện lỗi như `CONTENT_DECAY`, `CANNIBALIZATION`, `STRIKING_DISTANCE`. Action Center xử lý trạng thái khuyến nghị (khớp dữ liệu thực).
*   **Phase 3 (Agency Workflow):** Cơ chế phân quyền RBAC đa người dùng (Owner, Admin, Manager, SEO, Client), Internal/Client Notes và module xuất báo cáo White-label tùy biến màu sắc/logo.

---

## 🎯 Kế Hoạch Các Phase Tiếp Theo

### PHASE 4: Content Marketing Workflow
Tập trung vào việc tạo quy trình sản xuất nội dung dựa trên dữ liệu SEO có sẵn.

#### 1. T4.1 Research & Clustering (Nghiên cứu & Phân nhóm từ khóa)
*   **Nhiệm vụ:**
    *   Xây dựng kho lưu trữ từ khóa đề xuất (Keyword Universe).
    *   Phân loại mục đích tìm kiếm (Search Intent: Informational, Transactional, Commercial, Navigational).
    *   Phân cụm từ khóa (Keyword Clustering) dựa trên điểm tương đồng của kết quả tìm kiếm (SERP similarity).
    *   Phân tích khoảng trống nội dung (Content Gap) so với đối thủ cạnh tranh.
*   **Gợi ý triển khai:**
    *   Sử dụng API OpenAI/Gemini trong `services/ai` để chạy phân cụm từ khóa bằng vector embeddings hoặc phân tích prompt nếu số lượng từ khóa nhỏ.
    *   Tạo API endpoint `/content/research/cluster` nhận danh sách từ khóa và trả về cấu trúc nhóm chủ đề.

#### 2. T4.2 Planning (Lập kế hoạch nội dung)
*   **Nhiệm vụ:**
    *   Xây dựng bản đồ chủ đề (Topic Map / Topical Authority).
    *   Tạo lịch biên tập (Editorial Calendar) để quản lý lịch đăng bài.
    *   Trình sinh dàn bài tự động (Brief Generator) dựa trên AI.
*   **Gợi ý triển khai:**
    *   Tận dụng hàm `generate_openai_brief` đã có sẵn trong `services/ai/main.py`.
    *   Dựng giao diện tạo Brief trong tab Content: Người dùng chọn chủ đề hoặc từ khóa mục tiêu, nhấn "Tạo Brief", AI sẽ tự động phân tích đối thủ cạnh tranh trên SERP và xuất dàn bài gợi ý (tiêu đề, độ dài từ khóa, mật độ từ khóa, các câu hỏi thường gặp).

#### 3. T4.3 Optimization & Editor (Tối ưu hóa nội dung trong Editor)
*   **Nhiệm vụ:**
    *   Xây dựng trình soạn thảo chuẩn SEO (SEO Editor) kết nối trực tiếp với dữ liệu dự án.
    *   Gợi ý chèn liên kết nội bộ tự động (Internal Link Recommendations) ngay khi viết bài.
    *   Kiểm tra tính điểm tối ưu SEO (SEO Score) theo thời gian thực (độ dài tiêu đề, mật độ từ khóa, thẻ alt ảnh).

#### 4. T4.4 Performance Loop (Đo lường hiệu quả bài viết)
*   **Nhiệm vụ:**
    *   Kết nối bài viết đã đăng với GSC để đo lượt click/ấn tượng thực tế.
    *   Đẩy từ khóa bài viết vào Rank Tracker để theo dõi thứ hạng tự động.
    *   Phát hiện bài viết bị suy giảm lượng truy cập (Decay Detection) để gợi ý làm mới bài viết.

---

### PHASE 5: Production Hardening
Tập trung bảo mật, tối ưu hạ tầng và chuẩn bị môi trường chạy thật.

#### 1. T5.1 Cấu hình bảo mật Cloudflare & Mạng
*   **Nhiệm vụ:**
    *   Thiết lập Cloudflare Tunnel (chặn mọi truy cập trực tiếp bằng IP gốc, chỉ cho phép luồng dữ liệu đi qua Tunnel của Cloudflare).
    *   Cấu hình TLS tối thiểu 1.2/1.3, thiết lập Managed WAF Rules để chống tấn công SQL injection, XSS.
    *   Giới hạn tần suất gọi API (Rate Limiting) trên Cloudflare hoặc NestJS (dùng `@nestjs/throttler`).
    *   Sử dụng Cloudflare Access để bảo vệ trang quản trị Admin Console (`apps/admin`) nội bộ.

#### 2. T5.2 Bảo mật Ứng dụng & Dữ liệu
*   **Nhiệm vụ:**
    *   Bắt buộc xác thực và kiểm tra quyền thuê hộ (Tenant Isolation) ở tất cả các lớp API.
    *   Mã hóa khóa Refresh Token của GSC trong database (sử dụng thuật toán AES-256-GCM).
    *   Quét các thư viện phụ thuộc để vá lỗ hổng bảo mật (Dependency Scanning). Chống tấn công Server-Side Request Forgery (SSRF) trong Crawler.

#### 3. T5.3 Reliability (Độ tin cậy của hệ thống)
*   **Nhiệm vụ:**
    *   Dựng các endpoint `/health` (Health Checks) và `/ready` (Readiness Checks) để phục vụ giám sát container.
    *   Thiết lập cơ chế xử lý hàng đợi BullMQ: Tự động chạy lại khi lỗi (Retry with exponential backoff) và đưa các công việc lỗi nặng vào hàng đợi chết (Dead-letter Queue).
    *   Thiết lập cơ chế kiểm soát chi phí gọi API SERP & AI (Kill Switches & Feature Flags).

#### 4. T5.4 Backup & Khôi phục dữ liệu
*   **Nhiệm vụ:**
    *   Tự động sao lưu cơ sở dữ liệu PostgreSQL hàng ngày lên S3 lưu trữ an toàn.
    *   Thiết lập chính sách lưu trữ đối tượng (Retention Policy) cho tệp cào thô trên S3 (ví dụ: tự động xóa sau 30 ngày để tiết kiệm dung lượng).
    *   Chạy thử kịch bản khôi phục (Restore Test) để đảm bảo file backup hoạt động tốt khi gặp sự cố.

#### 5. T5.5 Observability (Giám sát hệ thống)
*   **Nhiệm vụ:**
    *   Tích hợp OpenTelemetry và Sentry để bắt các lỗi runtime ở cả frontend và backend.
    *   Dựng Dashboard Prometheus & Grafana theo dõi: Số lượng công việc lỗi trong hàng đợi, Tốc độ đồng bộ GSC (Sync Lag), Chi phí AI/SERP phát sinh theo từng dự án của khách hàng.

---

### PHASE 6: Commercial Operations
Chuẩn bị hệ thống thanh toán, phân gói dịch vụ và quản trị tập trung.

*   **T6.1 Billing & Quotas (Thanh toán & Phân chia hạn ngạch):** Tích hợp Stripe để xử lý đăng ký gói cước Pro/Agency. Thiết lập middleware kiểm tra hạn ngạch của workspace (ví dụ: gói Free chỉ được cào 100 trang/tháng, theo dõi tối đa 50 từ khóa).
*   **T6.2 Admin Console:** Dựng giao diện quản lý danh sách Workspace, tài khoản người dùng, xem lịch sử công việc bị lỗi, bật tắt tính năng bằng Feature Flags, và tra cứu nhật ký hệ thống (Audit Logs).
*   **T6.3 Legal:** Thiết lập trang Điều khoản dịch vụ (TOS), Chính sách bảo mật (Privacy Policy) và quy trình tự động xóa vĩnh viễn dữ liệu khi khách hàng yêu cầu hủy tài khoản.

---

### PHASE 7: Commercial Beta
*   **T7.1 Onboarding:** Mời 3 - 5 Agency thân thiết vào dùng thử phiên bản Beta với dự án thật.
*   **T7.2 Đo lường chỉ số:** Đánh giá tỷ lệ chấp nhận khuyến nghị tối ưu (Acceptance Rate), tỷ lệ báo cáo lỗi giả của AI (False-positive Rate) và tính toán chi phí vận hành trên mỗi dự án để điều chỉnh giá bán phù hợp.

---

## 🛠️ Hướng Dẫn Kỹ Thuật Để Bắt Đầu Tiếp Tục Ở Nhà

### 1. Cách khởi động nhanh dự án local
Bạn chỉ cần mở Powershell tại thư mục gốc và chạy lệnh:
```bash
pnpm dev
```
Lệnh này sẽ khởi chạy đồng thời các dịch vụ sau nhờ cấu hình `turbo`:
*   **Web App (Next.js):** chạy trên cổng [http://localhost:3001](http://localhost:3001)
*   **API Server (NestJS):** chạy trên cổng [http://localhost:3000](http://localhost:3000)
*   **AI Service (Python FastAPI):** chạy trên cổng [http://localhost:8000](http://localhost:8000)

*(Các worker Go crawler/collector sẽ tự động xử lý các tác vụ nền khi được NestJS đẩy việc qua BullMQ).*

### 2. Các tệp quan trọng cần chỉnh sửa khi viết code mới
*   **Database Schema:** [packages/db/src/schema.ts](file:///d:/Desktop/admin/SEO-Website/packages/db/src/schema.ts) (Nhớ chạy `pnpm db:generate` và `pnpm db:migrate` sau khi sửa schema).
*   **ClickHouse DDL:** [packages/clickhouse/src/init.ts](file:///d:/Desktop/admin/SEO-Website/packages/clickhouse/src/init.ts)
*   **API Module (NestJS):** [apps/api/src/](file:///d:/Desktop/admin/SEO-Website/apps/api/src/)
*   **Giao diện (Next.js):** [apps/web/src/app/page.tsx](file:///d:/Desktop/admin/SEO-Website/apps/web/src/app/page.tsx)

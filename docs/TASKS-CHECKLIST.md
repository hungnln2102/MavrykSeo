# SEO AI Commercial Platform - Tasks Checklist

Tài liệu này lưu trữ lộ trình phát triển chi tiết của dự án **SEO AI Commercial Platform**, dùng để theo dõi tiến độ từng phần việc. Các bước nào đã hoàn thành sẽ được đánh dấu `[x]`.

---

## 1. Môi trường & Cơ sở dữ liệu (Environment & Databases)
- [x] Khởi tạo cấu trúc dự án Monorepo baseline (Turborepo + pnpm)
- [x] Thiết lập khung thư mục cho các ứng dụng (`apps/`) và dịch vụ (`services/`)
- [x] Khởi tạo các package dùng chung: `packages/db`, `packages/clickhouse`, `packages/seo-core`
- [x] Khởi tạo kiểu dữ liệu và danh sách Canonical Events ban đầu (`packages/seo-core/src/index.ts`)
- [x] Thiết lập cấu hình `docker-compose.yml` local chạy PostgreSQL (kèm `pgvector`), ClickHouse, Redis, và S3-compatible (như MinIO)
- [x] Hoàn thiện Core Database Schema cho PostgreSQL (`packages/db/src/schema.ts`):
  - [x] Định nghĩa bảng `users` (Baseline ban đầu)
  - [x] Định nghĩa bảng `workspaces` (Không gian làm việc cho các Tenant)
  - [x] Định nghĩa bảng `memberships` (Liên kết user vào workspace với vai trò `UserRole` chi tiết)
  - [x] Định nghĩa bảng `projects` (Các dự án SEO thuộc workspace)
  - [x] Định nghĩa bảng `sites` (Các website cần theo dõi thuộc project)
  - [x] Định nghĩa bảng `integrations` (Cấu hình kết nối GSC, GA4, Search Console credentials)
  - [x] Định nghĩa các bảng nghiệp vụ khác (Keywords, recommendations/actions, reports)
- [x] Tạo migration và đồng bộ schema PostgreSQL local (Drizzle Kit generate & push)
- [x] Thiết lập ClickHouse database schema baseline cho dữ liệu quan sát lịch sử (observations):
  - [x] Schema cho Google Search Console daily data (`gsc_query_daily`, `gsc_page_daily`, etc.)
  - [x] Schema cho dữ liệu Crawl (`crawl_page_observations`)
  - [x] Schema cho Rank tracking (`rank_observations`)

- [x] Thiết lập hệ thống định dạng, phông chữ, và bảng màu (UX/UI Style Guide Setup - Web & Admin)
- [x] Lập trình khung giao diện Dashboard chính cho Web (Sleek Dark Mode & Translucent Frosted Glass)
- [x] Lập trình khung giao diện Dashboard chính cho Admin (Ruby Crimson Theme & Cloudflare Access SSO Mock)

---

## 2. Xác thực & Quản lý Tenant (Authentication & Tenancy)
- [x] Thiết lập cấu hình xác thực Better Auth hoặc JWT token baseline ở `apps/api`
- [x] Xây dựng Core API Module cho Workspace (Đăng ký workspace, quản lý thành viên, gán vai trò)
- [x] Xây dựng Core API Module cho Project & Site (CRUD Project, CRUD Site)
- [x] Triển khai cơ chế cô lập dữ liệu (Tenant Isolation Guard/Interceptor) cho các API truy vấn nghiệp vụ (Bảo vệ an toàn dữ liệu khách hàng theo workspace/project)

---

## 3. Thu thập dữ liệu (Data Acquisition - Crawler & Collector)
- [x] Triển khai Go HTTP Crawler (`services/crawler`): cào HTML thô, xử lý robots.txt, sitemap
- [x] Cấu hình cơ chế bảo mật cô lập crawler (Chống SSRF, giới hạn outbound IP, giới hạn kích thước response và thời gian kết nối)
- [x] Triển khai Go Collectors (`services/collector`): kết nối API hoặc công cụ ngoài để thu thập rank/SERP dữ liệu lớn
- [x] Tích hợp Crawler/Collector với Redis/BullMQ để nhận yêu cầu cào bất đồng bộ

---

## 4. Xử lý nền & Sự kiện (Background Jobs & Events)
- [x] Khởi tạo NestJS Worker (`services/worker`) tích hợp BullMQ
- [x] Đăng ký và xử lý các sự kiện canonical: `crawl.requested`, `crawl.completed`, `gsc.synced`
- [x] Triển khai worker lưu trữ dữ liệu thô (raw JSON/HTML) vào S3 Object Storage và đẩy các phân tích lịch sử vào ClickHouse

---

## 5. Trí tuệ nhân tạo (AI & NLP Service - Python)
- [ ] Thiết lập cấu hình FastAPI project (`services/ai`) bằng Python
- [ ] Xây dựng bộ tiền xử lý (Rules & Statistics) để tổng hợp tín hiệu SEO trước khi gửi cho LLM
- [ ] Tích hợp kết nối LLM qua AI Gateway và định nghĩa kiểu dữ liệu phản hồi (Pydantic Output Validation)

---

## 6. Bộ phân tích & Phát hiện lỗi SEO (SEO Detector Library)
- [ ] Triển khai mã nguồn cho các bộ dò lỗi ban đầu theo spec:
  - [ ] `CONTENT_DECAY` (Phát hiện nội dung giảm traffic theo thời gian)
  - [ ] `CTR_OPPORTUNITY` (Cơ hội tối ưu click-through-rate)
  - [ ] `STRIKING_DISTANCE` (Từ khóa tiệm cận top trang đầu)
  - [ ] `CANNIBALIZATION` (Trùng lặp mục tiêu từ khóa)
  - [ ] `ORPHAN_PAGE` (Các trang mồ côi không có link nội bộ)
- [ ] Tự động sinh khuyến nghị hành động đẩy vào Action Center tương ứng với kết quả phân tích của detectors

---

## 7. Giao diện người dùng (Frontend Apps)
- [ ] Triển khai giao diện Dashboard chính, Insights và Action Center trên Next.js (`apps/web`)
- [ ] Triển khai giao diện quản trị hệ thống (`apps/admin`) bảo vệ bằng Cloudflare Access

---

## 8. Vận hành & Giám sát (Operations & Observability)
- [ ] Cấu hình các Dockerfile multi-stage tối ưu hóa (non-root) cho tất cả dịch vụ
- [ ] Tích hợp OpenTelemetry, Sentry để theo dõi lỗi ứng dụng và Prometheus/Grafana để theo dõi tài nguyên hệ thống

# Detailed Features Checklist & Roadmap

Tài liệu này đóng vai trò là backlog chi tiết chứa toàn bộ các đầu việc và tính năng còn lại của hệ thống SEO AI Platform. Các công việc được phân chia theo 5 giai đoạn phát triển chính để triển khai cuốn chiếu.

---

## Giai đoạn 1: Bộ phân tích lỗi SEO nâng cao (Site Intelligence)
Mở rộng thư viện các Detector để quét và phân tích sâu các chỉ số kỹ thuật và cơ hội SEO.

### 1. Nhóm Dò lỗi kỹ thuật (Technical Audit Detectors)
- [x] **`TITLE_META_ISSUE` (Detector phát hiện lỗi Tiêu đề & Thẻ mô tả)**
  - [x] Thu thập dữ liệu meta title/description từ `crawl_page_observations` trong ClickHouse.
  - [x] Phát hiện các trang thiếu tiêu đề, tiêu đề trùng lặp, tiêu đề quá dài (>60 ký tự) hoặc quá ngắn (<30 ký tự).
  - [x] Phát hiện các trang thiếu meta description, description trùng lặp, quá dài (>160 ký tự) hoặc quá ngắn (<70 ký tự).
  - [x] Xây dựng quy tắc tiền xử lý tín hiệu tại FastAPI và định nghĩa khuyến nghị AI tương ứng.
- [x] **`REDIRECT_ISSUE` (Detector phát hiện lỗi Chuyển hướng)**
  - [x] Lấy dữ liệu mã trạng thái HTTP (status_code) từ ClickHouse.
  - [x] Phát hiện các chuỗi chuyển hướng vòng lặp (redirect loops) hoặc chuyển hướng nhiều cấp (multiple redirects).
  - [x] Phân tích và đưa ra cảnh báo các trang redirect 302 thay vì 301 lâu dài.
- [x] **`CANONICAL_ISSUE` (Detector lỗi Thẻ chuẩn hóa Canonical)**
  - [x] Đọc thông tin thẻ canonical từ dữ liệu crawl trong ClickHouse.
  - [x] Phát hiện các trang không có thẻ canonical.
  - [x] Phát hiện các trang cấu hình canonical trỏ sang một tên miền/URL không tồn tại hoặc trỏ chéo lẫn nhau (canonical mismatch).
- [x] **`INDEXABILITY_ISSUE` (Detector lỗi Lập chỉ mục)**
  - [x] Phân tích trạng thái chỉ mục từ Google Search Console sync data.
  - [x] Phát hiện các trang bị chặn bởi robots.txt hoặc thẻ meta `noindex` nhưng vẫn có traffic lịch sử hoặc nằm trong sitemap.

### 2. Nhóm Phát hiện Cơ hội & Biến động Thứ hạng (Opportunities & Rank Shifts)
- [x] **`INTERNAL_LINK_OPPORTUNITY` (Phát hiện cơ hội liên kết nội bộ)**
  - [x] Phân tích văn bản nội dung các trang từ dữ liệu S3/ClickHouse.
  - [x] Tìm kiếm các cụm từ khoá quan trọng (anchor text tiềm năng) chưa được chèn link nhưng đang rank ở top 20, gợi ý liên kết đến trang đích tương ứng.
- [x] **`COMPETITOR_GAIN` (Phát hiện đối thủ tăng trưởng mạnh)**
  - [x] Phân tích biến động thứ hạng của đối thủ cạnh tranh từ bảng quan trắc thứ hạng (`rank_observations`).
  - [x] Cảnh báo khi có đối thủ vượt hạng ở các từ khóa trọng điểm của dự án.
- [x] **`LOST_RANKING` & `WINNING_PAGE` (Trang suy giảm vs. Trang bứt phá)**
  - [x] Phát hiện các từ khóa/URL bị mất vị trí đột ngột (rớt khỏi trang 1).
  - [x] Phát hiện các trang đang có đà tăng trưởng tự nhiên tốt để gợi ý bổ sung ngân sách SEO hoặc liên kết nội bộ để đẩy mạnh hơn nữa.

---

## Giai đoạn 2: Vận hành Đại lý & Phân quyền (Agency Operations & Tenant Isolation)
Đảm bảo khả năng đa khách hàng (multi-client) và phân quyền chặt chẽ cho SEO Agency.

### 1. Phân quyền và Vai trò (Role-Based Access Control)
- [x] Triển khai phân quyền người dùng tại API backend (`apps/api`) dựa trên vai trò:
  - `Owner`, `Admin`, `Manager`, `SEO`, `Content`, `Client`, `Viewer`.
- [x] Tạo middleware kiểm tra quyền hạn chi tiết trên các endpoint nhạy cảm (ví dụ: chỉ cấu hình hệ thống hoặc kết nối API key mới được thực hiện bởi Owner/Admin).
- [x] Triển khai ẩn/hiển thị các ghi chú nội bộ (internal notes vs. client-visible notes) tùy thuộc vào token người dùng là nhân viên Agency hay Khách hàng (Client).

### 2. Quản lý Workspace & Giới hạn Tài nguyên (Quota Management)
- [x] Triển khai bộ kiểm soát quota (Rate Limiting & Quota Manager) cho từng Workspace tương ứng với gói cước (Enterprise, Pro, Free).
- [x] Tích hợp tính năng khoá/tạm dừng dự án (Suspend tenant) trực tiếp từ giao diện Admin.
- [x] Xây dựng mô-đun Báo cáo White-label: Cho phép Agency cấu hình Logo, màu sắc thương hiệu và xuất bản báo cáo SEO định kỳ gửi tự động cho khách hàng.

---

## Giai đoạn 3: Phân tích Từ khóa & Giám sát Đối thủ (SEO Research & Rank Tracking)
Triển khai mô-đun Nghiên cứu từ khóa nâng cao và theo dõi vị trí tự động.

### 1. Nghiên cứu Từ khóa (Keyword Research & Clustering)
- [x] Tích hợp dịch vụ Go Collector (`services/collector`) để thu thập dữ liệu SERP, Search Volume và CPC thực tế.
- [x] Xây dựng thuật toán phân cụm từ khóa (Keyword Clustering) dựa trên độ tương đồng SERP tại dịch vụ AI (`services/ai`).
- [x] Phân tích ý định tìm kiếm của người dùng (Search Intent: Informational, Navigational, Commercial, Transactional).

### 2. Giám sát Đối thủ & Khoảng cách Từ khóa (Keyword Gap)
- [x] Xây dựng công cụ so sánh khoảng cách từ khóa (Keyword Gap): Tìm những từ khóa đối thủ đang rank tốt nhưng dự án hiện tại chưa có nội dung tương ứng.
- [x] Theo dõi biến động vị trí hàng ngày của đối thủ cạnh tranh trên SERP.

---

## Giai đoạn 4: Kế hoạch Nội dung & Dàn ý AI (Content Planner & Brief Creator)
Tự động hóa workflow biên tập nội dung dựa trên dữ liệu SEO thực tế.

### 1. Lập kế hoạch Nội dung (Content Planner & Topic Map)
- [x] Xây dựng bản đồ chủ đề (Topic Map / Topical Authority): Bản đồ liên kết các thực thể và chủ đề cần viết để phủ toàn bộ ngành hàng.
- [x] Lập lịch biên tập bài viết (Content Calendar) cho nhóm Content Writer.

### 2. Sinh dàn ý bài viết bằng AI (AI Brief Creator)
- [x] Tích hợp dịch vụ FastAPI AI để sinh dàn ý bài viết (Brief) chuẩn SEO:
  - Cấu trúc tiêu đề (H1, H2, H3), số lượng từ mục tiêu, danh sách từ khóa cần xuất hiện.
  - Phân tích cấu trúc các bài viết top đầu của đối thủ để làm chuẩn so sánh.
- [x] Xây dựng giao diện biên tập bài viết với thanh đo điểm chuẩn SEO thời gian thực (Real-time Content Optimizer).

---

## Giai đoạn 5: Vận hành & Giám sát Hệ thống (Operations & Observability)
Triển khai hệ thống lên môi trường production an toàn và giám sát hiệu năng.

### 1. Đóng gói Container tối ưu (Dockerization)
- [x] Cấu hình các `Dockerfile` đa tầng (multi-stage) cho tất cả dịch vụ trong monorepo (`web`, `admin`, `api`, `worker`, `ai`, `crawler`, `collector`).
- [x] Cấu hình chạy ứng dụng bằng quyền non-root user bên trong container để đảm bảo bảo mật.

### 2. Giám sát hệ thống (Observability Stack)
- [x] Triển khai Prometheus và Grafana để thu thập, trực quan hóa các chỉ số tài nguyên hệ thống (CPU, RAM, số lượng queue backlog trong Redis).
- [x] Tích hợp OpenTelemetry tại các backend node (NestJS, FastAPI, Go) để theo dõi luồng request (Distributed Tracing) và ghi nhận log lỗi tập trung qua Sentry.


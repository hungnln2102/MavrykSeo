# Core Product Workflows

## 1. Agency onboarding

`Create Workspace → Add Client Project → Add Site → Connect GSC → Configure Crawl → Configure Rank Tracking → Initial Sync → First Insights → First Actions`

Time-to-first-value phải được đo.

## 2. Site Audit

`Start Crawl → Fetch → Raw S3 → Normalize → ClickHouse → Detectors → Issues → Evidence → Action Center`

UI tối thiểu: - health overview - crawl status/history - issue
categories/severity - affected URLs - evidence - explanation -
recommended action - filters/export - create/accept action

## 3. Rank Tracker

`Tracked Keywords → Scheduled Collection → SERP/Rank Observations → History → Winners/Losers → Visibility → Actions`

UI tối thiểu: - keyword - current/previous/best position - delta -
landing URL - country/device - SERP features - history - Top 3/10/20/100
distribution - competitor visibility - winners/losers

## 4. GSC Intelligence

`OAuth → Property → Backfill → Incremental Sync → Normalize → Detect → Insights`

Phải có sync status, freshness, retry, quota handling, token refresh và
reconnect.

## 5. Action Center

Nguồn action: - Technical SEO - GSC - Rank Tracker - Content -
Competitors - AI/analytics

Lifecycle:
`Detected → Shown → Accepted/Rejected → Assigned → In Progress → Completed → Verified → Measured`

## 6. Content Marketing

`Keyword → Cluster → Topic → Intent → Gap → Topic Map → Planner → Brief → Content → Published URL → Performance → Refresh`

AI editor không được tách rời dữ liệu SEO thực.

## 7. Agency collaboration

Mỗi action/task hỗ trợ: - owner - due date - status - priority -
comments - mentions - internal notes - client-visible notes -
approvals - activity history

## 8. Reporting

Report phải trả lời: - đã làm gì; - thay đổi gì; - kết quả gì; - vấn
đề/cơ hội tiếp theo; - ai phụ trách.

Hỗ trợ branding, period comparison, annotations, scheduled delivery và
client view.

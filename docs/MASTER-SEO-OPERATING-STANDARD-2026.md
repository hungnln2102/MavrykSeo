# MASTER SEO OPERATING STANDARD 2026

> **Mục đích:** Checklist chuẩn duy nhất cho toàn bộ vòng đời một dự án SEO Agency  
> **Phiên bản:** 1.0  
> **Ngày khóa nguồn:** 2026-08-23  
> **Phạm vi:** Strategy → Data → Research → Technical → Content → Authority → Specialized SEO → Delivery → QA → Measurement  
> **Nguyên tắc:** Mỗi checklist item là một control có thể xác minh, không phải lời khuyên chung chung.

---

## 0. Căn cứ xây dựng

Không có một checklist SEO duy nhất được toàn ngành bắt buộc sử dụng. Bộ chuẩn này hợp nhất:

1. **Nguồn chính quy:** Google Search Central, Search Console, Google Analytics, Google Business Profile, Chrome/web.dev, Schema.org, W3C/WCAG, RFC 9309.
2. **Nguồn thực hành được công nhận:** tài liệu chính thức của Screaming Frog, Semrush và Ahrefs để đối chiếu độ phủ kiểm tra và workflow agency.
3. **Nghiệp vụ Agency:** kickoff, strategy, keyword research, content production, Digital PR, approval, QA, reporting, capacity và client collaboration.
4. **Nguyên tắc kiểm chứng:** dữ liệu quan sát, dữ liệu suy diễn, dữ liệu ước tính và nội dung AI phải được gắn nhãn riêng.

### 0.1. Nguồn chính

| ID | Nguồn |
|---|---|
| SRC-GSE | [Google Search Essentials](https://developers.google.com/search/docs/essentials) |
| SRC-GSTART | [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) |
| SRC-GWORKS | [How Google Search Works](https://developers.google.com/search/docs/fundamentals/how-search-works) |
| SRC-GSPAM | [Google Spam Policies](https://developers.google.com/search/docs/essentials/spam-policies) |
| SRC-GHELP | [Helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) |
| SRC-GAI | [Google guidance for generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content) |
| SRC-GCRAWL | [Google Crawling and Indexing](https://developers.google.com/search/docs/crawling-indexing) |
| SRC-GROBOTS | [Robots.txt guidance](https://developers.google.com/search/docs/crawling-indexing/robots/intro) |
| SRC-GSITEMAP | [Sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview) |
| SRC-GCANON | [Canonicalization](https://developers.google.com/search/docs/crawling-indexing/canonicalization) |
| SRC-GJS | [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) |
| SRC-GMOBILE | [Mobile-first indexing](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing) |
| SRC-GSD | [Structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) |
| SRC-GECOM | [Google Ecommerce SEO](https://developers.google.com/search/docs/specialty/ecommerce) |
| SRC-GSC | [Search Console reports](https://support.google.com/webmasters/answer/9133276) |
| SRC-GSCAPI | [Search Console API](https://developers.google.com/webmaster-tools/v1/api_reference_index) |
| SRC-GA4 | [Google Analytics Data API](https://developers.google.com/analytics/devguides/reporting/data/v1) |
| SRC-CWV | [Core Web Vitals](https://web.dev/articles/vitals) |
| SRC-PSI | [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started) |
| SRC-SCHEMA | [Schema.org](https://schema.org/) |
| SRC-GBP | [Google Business Profile guidelines](https://support.google.com/business/answer/3038177) |
| SRC-GBPAPI | [Google Business Profile APIs](https://developers.google.com/my-business) |
| SRC-RFC9309 | [Robots Exclusion Protocol](https://www.rfc-editor.org/info/rfc9309/) |
| SRC-WCAG | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) |
| SRC-SF | [Screaming Frog User Guide](https://www.screamingfrog.co.uk/seo-spider/user-guide/) |
| SRC-SEMRUSH | [Semrush Site Audit](https://www.semrush.com/kb/31-site-audit) |
| SRC-AHREFS | [Ahrefs API and SEO datasets](https://docs.ahrefs.com/en/api/docs/introduction) |

### 0.2. Cấp bằng chứng

| Cấp | Ý nghĩa |
|---|---|
| A | Chính sách, hướng dẫn hoặc API chính thức |
| B | Workflow/cảnh báo của công cụ được ngành sử dụng rộng rãi; phải xác minh ngữ cảnh |
| C | Mô hình/giả thuyết của Agency; bắt buộc có phương pháp và measurement plan |
| X | Myth hoặc chỉ số không đủ căn cứ; không được dùng làm lỗi cứng |

### 0.3. Trạng thái checklist

`Not checked → Need data → Checked → Finding created → Action planned → In progress → Ready for QA → Monitoring → Done`

Kết quả control: `PASS`, `FAIL`, `WARNING`, `NOT_APPLICABLE`, `NEED_DATA`, `ACCEPTED_RISK`.

---

## 1. Metadata bắt buộc cho mọi checklist item

```yaml
control_id: TECH-IDX-001
module: Technical SEO
phase: Assess | Plan | Execute | QA | Monitor
applicability: Core | Ecommerce | Local | International | Publisher | Migration
evidence_level: A | B | C
source_ids: [SRC-GCANON]
status: Not checked
result: NEED_DATA
scope: domain/template/url/market/device
method: cách kiểm tra tái lập
evidence: artifact + timestamp + filters
finding: điều quan sát được
root_cause: xác minh hoặc unknown
severity: Critical | High | Medium | Low | Opportunity
owner: một cá nhân
approver: một cá nhân
due_date: YYYY-MM-DD
acceptance_criteria: điều kiện Pass
qa_evidence: artifact sau triển khai
measurement_window: 7/14/28/90 ngày
outcome: observed result + confidence
```

---

## 2. Module 1 — Project Setup, Strategy và Governance

### Assess

- [ ] **STR-001** Thu thập business model, sản phẩm/dịch vụ, biên lợi nhuận, thị trường và mùa vụ.
- [ ] **STR-002** Xác định website type: ecommerce, lead-gen, publisher, local, marketplace, SaaS hoặc hybrid.
- [ ] **STR-003** Xác định domain/subdomain/folder, quốc gia, ngôn ngữ, device và search engine trong scope.
- [ ] **STR-004** Ghi nhận redesign, migration, campaign, promotion, tracking change và Google update trước đó.
- [ ] **STR-005** Xác định đối thủ kinh doanh và đối thủ thực tế trên SERP; không mặc định hai nhóm giống nhau.
- [ ] **STR-006** Audit quyền truy cập và dữ liệu thiếu.

### Plan và Execute

- [ ] **STR-007** Chốt mục tiêu business: qualified traffic, lead, transaction, revenue hoặc retention.
- [ ] **STR-008** Chốt KPI SEO leading/lagging và KPI guardrail.
- [ ] **STR-009** Thiết lập baseline, target, deadline, owner và nguồn đo cho từng KPI.
- [ ] **STR-010** Xây RACI cho Agency, Client, IT, Content, Analytics và Legal.
- [ ] **STR-011** Chốt SLA phê duyệt, triển khai, incident và phản hồi.
- [ ] **STR-012** Lập risk, dependency, assumption và decision register.
- [ ] **STR-013** Lập roadmap Now/Next/Later theo impact, confidence, reach và effort.
- [ ] **STR-014** Chốt cadence daily/weekly/monthly/quarterly.

### QA và Monitor

- [ ] **STR-015** Mọi objective có baseline/target/source/owner.
- [ ] **STR-016** Mọi hạng mục ngoài scope có lý do và người duyệt.
- [ ] **STR-017** Strategy review hàng quý dựa trên dữ liệu mới, không giữ roadmap cố định máy móc.

---

## 3. Module 2 — Data, Tracking và Source Governance

### Assess

- [ ] **DATA-001** Xác minh GSC property và quyền truy cập đúng domain.
- [ ] **DATA-002** Xác minh GA4 property, data stream, timezone, currency và reporting identity.
- [ ] **DATA-003** Xác minh GTM/container hoặc tracking implementation nếu thuộc scope.
- [ ] **DATA-004** Inventory events, key events, ecommerce events và custom dimensions.
- [ ] **DATA-005** Đối soát transaction/revenue/lead với CRM hoặc backend.
- [ ] **DATA-006** Kiểm tra consent, referral exclusion, cross-domain và self-referral.
- [ ] **DATA-007** Kiểm tra GSC/GA4/API freshness, quota, sampling/threshold và missingness.
- [ ] **DATA-008** Kiểm tra bot/internal traffic filters và data retention.

### Plan và Execute

- [ ] **DATA-009** Tạo KPI dictionary: tên, công thức, scope, source, owner, update frequency.
- [ ] **DATA-010** Tạo source registry và lineage cho observed/derived/estimated/AI-generated.
- [ ] **DATA-011** Cấu hình OAuth/API ingestion cho GSC, GA4, GBP và nguồn đã chọn.
- [ ] **DATA-012** Tạo annotation cho release, content publish, backlink, promotion và incidents.
- [ ] **DATA-013** Thiết lập quality checks: freshness, duplicates, null, range, schema drift.
- [ ] **DATA-014** Thiết lập raw artifact retention và reprocessing policy.

### QA và Monitor

- [ ] **DATA-015** Test key event end-to-end từ browser đến GA4/CRM.
- [ ] **DATA-016** Reconcile doanh thu theo sample và ghi sai số cho phép.
- [ ] **DATA-017** Cảnh báo source stale, token revoked, quota exhausted và schema change.

---

## 4. Module 3 — Market, Audience và Competitor Intelligence

- [ ] **MKT-001** Xác định audience/persona dựa trên dữ liệu khách hàng, không chỉ AI persona.
- [ ] **MKT-002** Map customer journey và search journey.
- [ ] **MKT-003** Phân tích nhu cầu theo seasonality, geography và device.
- [ ] **MKT-004** Lập competitor set theo business, SERP, content, local và backlink.
- [ ] **MKT-005** Benchmark visibility, keyword footprint, content footprint và authority bằng cùng nguồn/ngày.
- [ ] **MKT-006** Phân tích SERP features và loại kết quả chiếm ưu thế.
- [ ] **MKT-007** Phân tích value proposition và lý do người dùng chọn đối thủ.
- [ ] **MKT-008** Lập opportunity/risk register theo market.
- [ ] **MKT-009** Ghi rõ metric bên thứ ba là Estimated, kèm provider/database/date.
- [ ] **MKT-010** Review competitor set hàng quý hoặc khi SERP thay đổi lớn.

---

## 5. Module 4 — Keyword, Query và SERP Intelligence

### Research

- [ ] **KW-001** Tổng hợp query từ GSC, site search, CRM, support, rank provider và keyword provider.
- [ ] **KW-002** Chuẩn hóa ngôn ngữ, spelling, brand/non-brand, geography và duplicates.
- [ ] **KW-003** Gắn source, volume database, date, device và country.
- [ ] **KW-004** Phân loại search intent bằng SERP hiện tại và business context.
- [ ] **KW-005** Cluster theo SERP overlap, semantic relationship và user task; lưu method/threshold.
- [ ] **KW-006** Xác định parent topic, subtopic, entity và modifier.
- [ ] **KW-007** Phân tích keyword gap và content gap với competitor set hợp lệ.
- [ ] **KW-008** Phân tích SERP feature: local, product, image, video, news, forum, AI feature.
- [ ] **KW-009** Xác định zero/low-volume queries có business value từ GSC/CRM/support.

### Mapping và Tracking

- [ ] **KW-010** Map cluster → URL hiện có / URL mới / không nhắm mục tiêu.
- [ ] **KW-011** Xác minh cannibalization theo query×URL×time; nhiều URL không tự động là lỗi.
- [ ] **KW-012** Quyết định keep/merge/redirect/reposition/create cho conflict.
- [ ] **KW-013** Chấm opportunity theo relevance, value, reach, confidence, competitiveness và effort.
- [ ] **KW-014** Chọn keyword tracking set theo tier và cadence.
- [ ] **KW-015** Lưu baseline rank, landing page, SERP feature, market và device.
- [ ] **KW-016** Theo dõi URL switching, winners/losers và share of visibility.
- [ ] **KW-017** Review keyword map sau content/site architecture changes.

---

## 6. Module 5 — Technical SEO

### Host, HTTP và Security

- [ ] **TECH-HOST-001** DNS/host availability và Crawl Stats.
- [ ] **TECH-HOST-002** HTTPS, certificate, mixed content và preferred host.
- [ ] **TECH-HOST-003** Status 2xx/3xx/4xx/5xx, soft 404, redirect chain và loop.
- [ ] **TECH-HOST-004** Manual Actions, Security Issues, hacked content và malware.
- [ ] **TECH-HOST-005** Server response consistency theo user-agent/device/geography.

### Crawl và Discovery

- [ ] **TECH-CRAWL-001** robots.txt syntax, availability và intent; không dùng làm access control.
- [ ] **TECH-CRAWL-002** URL/resource quan trọng bị block.
- [ ] **TECH-CRAWL-003** Meta robots và X-Robots-Tag.
- [ ] **TECH-CRAWL-004** XML sitemap syntax, status, lastmod và URL quality.
- [ ] **TECH-CRAWL-005** Sitemap không chứa redirect, error, noindex hoặc non-canonical URLs.
- [ ] **TECH-CRAWL-006** Orphan pages bằng crawl+sitemap+GSC+GA4+backlink merge.
- [ ] **TECH-CRAWL-007** Crawl traps, parameters, faceted navigation và internal search.
- [ ] **TECH-CRAWL-008** Crawl budget/log analysis chỉ áp dụng khi quy mô/triệu chứng phù hợp.

### Index và Canonical

- [ ] **TECH-IDX-001** Index policy theo template.
- [ ] **TECH-IDX-002** GSC Page Indexing reasons theo segment.
- [ ] **TECH-IDX-003** URL Inspection mẫu phân tầng cho indexed state và Google canonical.
- [ ] **TECH-IDX-004** Canonical target 200, indexable, tương đương và không chain.
- [ ] **TECH-IDX-005** Redirect/canonical/sitemap/internal-link/hreflang signals nhất quán.
- [ ] **TECH-IDX-006** Duplicate variants: protocol, host, case, slash, parameter, print và session.
- [ ] **TECH-IDX-007** Removed/expired pages dùng 404/410/noindex/auth/redirect đúng mục tiêu.
- [ ] **TECH-IDX-008** Không kết luận sitemap submission hoặc canonical là bảo đảm index.

### Architecture và Internal Link

- [ ] **TECH-ARCH-001** URL structure ổn định và crawlable.
- [ ] **TECH-ARCH-002** Hierarchy phản ánh taxonomy và user journey.
- [ ] **TECH-ARCH-003** Priority pages có đường `<a href>` crawlable.
- [ ] **TECH-ARCH-004** Broken links và links qua redirect.
- [ ] **TECH-ARCH-005** Anchor text mô tả và không nhồi từ khóa.
- [ ] **TECH-ARCH-006** Click depth theo business priority; không dùng ngưỡng 3-click tuyệt đối.
- [ ] **TECH-ARCH-007** Breadcrumb UI và structured data khớp nhau.
- [ ] **TECH-ARCH-008** Pagination/infinite scroll có URL và link tuần tự.

### JavaScript và Mobile

- [ ] **TECH-JS-001** Raw HTML vs rendered HTML vs indexed snapshot.
- [ ] **TECH-JS-002** Main content, links, metadata và schema render thành công.
- [ ] **TECH-JS-003** JS/CSS resource blocking, console/network/render errors.
- [ ] **TECH-JS-004** SPA routes có URL deep-link và history behavior hợp lệ.
- [ ] **TECH-JS-005** Lazy content không phụ thuộc thao tác crawler không thực hiện.
- [ ] **TECH-MOB-001** Mobile/desktop content, metadata, image, links và schema parity.
- [ ] **TECH-MOB-002** Viewport, touch, overflow và intrusive interstitial.

### Performance và CWV

- [ ] **TECH-CWV-001** Dùng field data p75 tách mobile/desktop khi đủ dữ liệu.
- [ ] **TECH-CWV-002** LCP Good ≤2,5s; phân tích TTFB/discovery/load/render delay.
- [ ] **TECH-CWV-003** INP Good ≤200ms; phân tích input/processing/presentation delay.
- [ ] **TECH-CWV-004** CLS Good ≤0,1; phân tích image/ad/embed/font/dynamic shifts.
- [ ] **TECH-CWV-005** Lab data dùng chẩn đoán, không thay thế field data.
- [ ] **TECH-CWV-006** Group theo template/origin và kiểm tra regression sau release.

### Structured Data và International

- [ ] **TECH-SD-001** Schema type phù hợp Search Gallery và page type.
- [ ] **TECH-SD-002** Required properties, syntax và Rich Results validation.
- [ ] **TECH-SD-003** Markup khớp nội dung visible, hiện hành và không misleading.
- [ ] **TECH-SD-004** Báo “eligible”, không bảo đảm rich result/ranking.
- [ ] **TECH-INT-001** Locale có URL riêng khi phù hợp.
- [ ] **TECH-INT-002** Hreflang code, reciprocal links, x-default và canonical consistency.
- [ ] **TECH-INT-003** Không ép geo/language redirect chặn crawler/người dùng.

---

## 7. Module 6 — Information Architecture và Taxonomy

- [ ] **IA-001** Inventory page types và templates.
- [ ] **IA-002** Map business taxonomy với query/topic taxonomy.
- [ ] **IA-003** Xác định hub/category/subcategory/detail relationships.
- [ ] **IA-004** Phân biệt navigation, contextual, utility và footer links.
- [ ] **IA-005** Thiết kế URL rules và naming conventions.
- [ ] **IA-006** Xác định filter/facet index policy dựa trên demand và uniqueness.
- [ ] **IA-007** Xác định pagination, sorting và onsite search policy.
- [ ] **IA-008** Review orphan/underlinked/overlinked priority pages.
- [ ] **IA-009** QA architecture bằng crawl graph và user task testing.
- [ ] **IA-010** Version taxonomy changes và redirect/migration impact.

---

## 8. Module 7 — On-page SEO

- [ ] **ONP-001** Title mô tả đúng, riêng biệt, hữu ích; không áp giới hạn ký tự cứng.
- [ ] **ONP-002** Meta description riêng cho URL quan trọng; không áp 150–160 ký tự như policy.
- [ ] **ONP-003** H1–H6 hỗ trợ cấu trúc đọc; không Fail chỉ vì nhiều H1.
- [ ] **ONP-004** Main content đáp ứng intent và page purpose.
- [ ] **ONP-005** Entity/terminology/topic coverage đủ cho user task.
- [ ] **ONP-006** URL slug và breadcrumb nhất quán.
- [ ] **ONP-007** Image filename/context/alt/dimension/load behavior.
- [ ] **ONP-008** Internal links in/out theo context và target priority.
- [ ] **ONP-009** CTA phù hợp intent và không cản main content.
- [ ] **ONP-010** Author/reviewer/source/update disclosure khi phù hợp.
- [ ] **ONP-011** Schema, canonical, robots và social metadata đúng template.
- [ ] **ONP-012** Live QA sau publish bằng render+crawl+tracking.

---

## 9. Module 8 — Content Strategy và Content Operations

### Inventory và Audit

- [ ] **CONT-001** Inventory URL, template, target, owner, publish/update date.
- [ ] **CONT-002** Ghép GSC, GA4, conversion, backlink, crawl và keyword data.
- [ ] **CONT-003** Phân loại Keep/Update/Merge/Redirect/Remove/Create.
- [ ] **CONT-004** Xác định content decay theo query/page/time và seasonality.
- [ ] **CONT-005** Đánh giá originality, usefulness, accuracy, trust và conversion role.
- [ ] **CONT-006** Không dùng word count làm ngưỡng quality chung.

### Planning và Production

- [ ] **CONT-007** Xây topic/content roadmap từ objective và gap.
- [ ] **CONT-008** Content brief gồm audience, intent, query cluster, outline, entities, sources, links và CTA.
- [ ] **CONT-009** Xác định format: guide, category, product, comparison, tool, video, local page hoặc data asset.
- [ ] **CONT-010** Giao writer, SME, editor, SEO reviewer, legal reviewer và approver.
- [ ] **CONT-011** Fact-check claim và nguồn; quy định riêng cho YMYL.
- [ ] **CONT-012** Originality/plagiarism và copyrighted material review.
- [ ] **CONT-013** AI usage log, provenance, human review và scaled-content safeguards.
- [ ] **CONT-014** Editorial, brand, SEO, legal và accessibility review.

### Publish và Optimize

- [ ] **CONT-015** Publish metadata/canonical/schema/internal-link/media/tracking đầy đủ.
- [ ] **CONT-016** Kiểm tra live rendering, crawlability và indexability.
- [ ] **CONT-017** Theo dõi discovery/index/rank/traffic/conversion 7/14/28/90 ngày.
- [ ] **CONT-018** So sánh cohort new/update/control khi khả thi.
- [ ] **CONT-019** Quyết định giữ, mở rộng, refresh, merge hoặc rollback.
- [ ] **CONT-020** Content governance chống doorway, scaled abuse, site reputation abuse và outdated claims.

---

## 10. Module 9 — Entity, Brand và Trust

- [ ] **ENT-001** Organization identity, legal name, contact, about và policies nhất quán.
- [ ] **ENT-002** Author/reviewer profiles và expertise evidence phù hợp nội dung.
- [ ] **ENT-003** Product/service claims có source và terms rõ.
- [ ] **ENT-004** Organization/Person/LocalBusiness schema khớp visible content.
- [ ] **ENT-005** Brand mentions và branded query footprint baseline.
- [ ] **ENT-006** Reputation/review sources được giám sát hợp lệ.
- [ ] **ENT-007** Third-party content ownership/editorial responsibility rõ.
- [ ] **ENT-008** Không tạo “E-E-A-T score” giả hoặc tuyên bố là ranking factor trực tiếp.
- [ ] **ENT-009** Crisis/misinformation/outdated information response workflow.
- [ ] **ENT-010** Đo branded search, direct/referral và assisted conversion có giới hạn attribution.

---

## 11. Module 10 — Off-page, Link Building và Digital PR

### Audit

- [ ] **OFF-001** Backlink/referring-domain trend và data source/date.
- [ ] **OFF-002** Link gap với competitor set phù hợp.
- [ ] **OFF-003** Lost/new/broken links và target page status.
- [ ] **OFF-004** Paid/sponsored/UGC link compliance.
- [ ] **OFF-005** Manual action/link spam risk; không disavow tự động theo toxic score.

### Strategy và Execution

- [ ] **OFF-006** Chọn mục tiêu campaign: authority, referral, brand mention, coverage hoặc linkable asset.
- [ ] **OFF-007** Prospect theo **Theme – Trust – Traffic**, editorial legitimacy và audience fit.
- [ ] **OFF-008** Không dùng AS/DR/DA làm điều kiện duy nhất; ghi rõ đây là metric bên thứ ba.
- [ ] **OFF-009** Xây asset/angle/outreach list/budget/approval/brand safety.
- [ ] **OFF-010** Theo dõi contact, pitch, negotiation, placement, cost và disclosure.
- [ ] **OFF-011** QA live URL, context, anchor, target, rel, indexability và content quality.
- [ ] **OFF-012** Link reclaim và correction workflow.

### Measurement

- [ ] **OFF-013** Đo coverage, referral, assisted conversion, branded search và visibility.
- [ ] **OFF-014** Dùng time window và matched pages khi khả thi.
- [ ] **OFF-015** Không khẳng định một backlink trực tiếp tạo tăng hạng khi thiếu causal evidence.

---

## 12. Module 11 — Local SEO

- [ ] **LOCAL-001** Xác minh GBP eligibility, ownership và access.
- [ ] **LOCAL-002** Business name đúng thực tế, không keyword stuffing.
- [ ] **LOCAL-003** Primary/additional categories đúng hoạt động.
- [ ] **LOCAL-004** Address/service area/hours/phone/website/attributes chính xác.
- [ ] **LOCAL-005** Location/store inventory và duplicate profile audit.
- [ ] **LOCAL-006** Store locator và landing page riêng có giá trị thật.
- [ ] **LOCAL-007** NAP consistency theo nguồn chính thức của doanh nghiệp.
- [ ] **LOCAL-008** LocalBusiness schema đúng location data.
- [ ] **LOCAL-009** Review acquisition/reply/escalation tuân thủ policy, không review gating.
- [ ] **LOCAL-010** Photos/posts/products/services updates nếu phù hợp.
- [ ] **LOCAL-011** Local rank tracking ghi grid/location/device/time.
- [ ] **LOCAL-012** Đo calls, directions, website clicks và local conversions.
- [ ] **LOCAL-013** Ghi rõ relevance, distance, prominence; không hứa hạng cố định.

---

## 13. Module 12 — Ecommerce SEO

- [ ] **ECOM-001** Category/subcategory/product/brand hierarchy.
- [ ] **ECOM-002** Facet/filter/sort URL và index policy.
- [ ] **ECOM-003** Product variants, canonical và ProductGroup strategy.
- [ ] **ECOM-004** Out-of-stock, discontinued, seasonal và replaced product policy.
- [ ] **ECOM-005** Product/Offer/Review schema và visible-data parity.
- [ ] **ECOM-006** Merchant Center feed vs landing page: price, availability, identifiers, URL.
- [ ] **ECOM-007** Product discovery qua links, sitemap và feed.
- [ ] **ECOM-008** Pagination/infinite scroll crawlability.
- [ ] **ECOM-009** Product/category content uniqueness và user value.
- [ ] **ECOM-010** Reviews/Q&A/UGC moderation và structured data compliance.
- [ ] **ECOM-011** Image quality, alt, variants và product media.
- [ ] **ECOM-012** Ecommerce tracking: view_item, add_to_cart, checkout, purchase, refund.
- [ ] **ECOM-013** Organic revenue, AOV, conversion rate và margin khi có dữ liệu.
- [ ] **ECOM-014** Promotion/price/stock annotations để tránh attribution sai.

---

## 14. Module 13 — International SEO

- [ ] **INT-001** Market/language demand và business availability.
- [ ] **INT-002** URL structure: ccTLD/subdomain/subfolder theo constraints.
- [ ] **INT-003** Locale URL riêng thay vì chỉ cookie/browser personalization.
- [ ] **INT-004** Hreflang language-region code hợp lệ.
- [ ] **INT-005** Self/reciprocal hreflang và cluster completeness.
- [ ] **INT-006** Canonical và hreflang không xung đột.
- [ ] **INT-007** x-default khi có selector/global page phù hợp.
- [ ] **INT-008** Không auto-redirect cản crawler/người dùng.
- [ ] **INT-009** Localized content, currency, inventory, legal và contact data.
- [ ] **INT-010** Tracking/report tách market/language/device.

---

## 15. Module 14 — Image, Video, News và Publisher SEO

- [ ] **MEDIA-001** Image crawlability, context, alt, dimensions và performance.
- [ ] **MEDIA-002** Image sitemap/metadata/licensing khi phù hợp.
- [ ] **MEDIA-003** Video watch page, embed, thumbnail và VideoObject markup.
- [ ] **MEDIA-004** Video indexing report và primary-content eligibility.
- [ ] **MEDIA-005** Article/NewsArticle schema đúng visible content.
- [ ] **MEDIA-006** News sitemap chỉ chứa nội dung/ngày phù hợp.
- [ ] **MEDIA-007** Publication date, modified date, author và corrections policy.
- [ ] **MEDIA-008** Paywall/subscription markup và cloaking safeguards.
- [ ] **MEDIA-009** Publisher archive/tag/topic taxonomy và thin pages.
- [ ] **MEDIA-010** Discover/News performance theo nguồn khả dụng, không hứa eligibility.

---

## 16. Module 15 — AI Search Visibility

- [ ] **AI-001** Đảm bảo nền tảng crawl/index/content quality trước mọi “AI optimization”.
- [ ] **AI-002** Nội dung có cấu trúc rõ, nguồn, tác giả, entity và claim chính xác.
- [ ] **AI-003** Không tạo hàng loạt trang cho fan-out queries nhằm thao túng.
- [ ] **AI-004** Theo dõi referral từ AI platforms khi analytics nhận diện được.
- [ ] **AI-005** Theo dõi brand mention/citation bằng prompt set phiên bản hóa.
- [ ] **AI-006** Ghi model, region, account state, prompt, date và stochastic variability.
- [ ] **AI-007** Label AI visibility metrics là Estimated/Derived.
- [ ] **AI-008** Không hứa citation hoặc dùng schema không được hỗ trợ như “AI ranking hack”.
- [ ] **AI-009** Content provenance và human QA cho nội dung AI-assisted.
- [ ] **AI-010** Review policy/search changes định kỳ.

---

## 17. Module 16 — Conversion, CRO và Business Outcomes

- [ ] **CRO-001** Map organic landing page → user intent → CTA → conversion.
- [ ] **CRO-002** Xác định micro/macro/qualified conversions.
- [ ] **CRO-003** Kiểm tra form, phone, chat, store, checkout và error paths.
- [ ] **CRO-004** Mobile UX và accessibility trên landing pages quan trọng.
- [ ] **CRO-005** Phân tích conversion rate theo page type/query intent/device.
- [ ] **CRO-006** Không tối ưu CTA làm sai intent hoặc che main content.
- [ ] **CRO-007** Thiết kế hypothesis, primary metric và guardrail cho experiment.
- [ ] **CRO-008** Ghi sample size, duration và limitations.
- [ ] **CRO-009** Đối soát lead quality/revenue/refund với CRM/backend.
- [ ] **CRO-010** Không kết luận SEO thành công chỉ bằng traffic nếu objective là revenue/lead.

---

## 18. Module 17 — Action Center, Delivery và Collaboration

- [ ] **ACT-001** Findings từ nhiều nguồn được deduplicate theo root cause+scope.
- [ ] **ACT-002** Mỗi action có owner, approver, priority, due date và dependency.
- [ ] **ACT-003** Mỗi action liên kết finding, evidence và affected URLs.
- [ ] **ACT-004** Tách internal note và client-visible note.
- [ ] **ACT-005** Approval workflow cho content, technical change, PR và risk acceptance.
- [ ] **ACT-006** Implementation evidence: ticket, PR, CMS revision hoặc deployment.
- [ ] **ACT-007** QA owner độc lập khi rủi ro cao.
- [ ] **ACT-008** Blocker/escalation/SLA và overdue workflow.
- [ ] **ACT-009** Capacity/workload theo role/project.
- [ ] **ACT-010** Immutable activity/audit log cho thao tác nhạy cảm.

---

## 19. Module 18 — QA, Release và Regression

- [ ] **QA-001** Acceptance criteria xác định trước khi triển khai.
- [ ] **QA-002** Test staging và live, không chỉ CMS preview.
- [ ] **QA-003** Re-crawl affected scope và priority regression sample.
- [ ] **QA-004** Raw vs rendered HTML sau thay đổi.
- [ ] **QA-005** Status/robots/canonical/hreflang/schema/internal links.
- [ ] **QA-006** Tracking/key events/revenue sau release.
- [ ] **QA-007** Mobile/device/browser checks.
- [ ] **QA-008** Feature flag/rollback khi rủi ro cao.
- [ ] **QA-009** Annotation và release evidence.
- [ ] **QA-010** Chuyển Monitoring chỉ khi QA Pass.

---

## 20. Module 19 — Monitoring, Incident và Algorithm Updates

- [ ] **MON-001** Theo dõi source connection, freshness và quota.
- [ ] **MON-002** Alert host errors, robots/noindex/canonical/sitemap regressions.
- [ ] **MON-003** Alert traffic/click/impression/conversion anomalies theo baseline.
- [ ] **MON-004** Alert rank/URL switching/SERP changes theo tracked set.
- [ ] **MON-005** Alert manual action/security/hacked signals.
- [ ] **MON-006** Incident severity, owner, communication và timeline.
- [ ] **MON-007** Khi Google update: ghi thời gian, chờ/quan sát đúng mức, phân tích cluster bị ảnh hưởng.
- [ ] **MON-008** Sau update: phân tách technical/content/offsite/common root cause.
- [ ] **MON-009** Không quy mọi biến động cho algorithm update khi chưa đối chiếu release/promotion/tracking.
- [ ] **MON-010** Post-incident review và detector/regression update.

---

## 21. Module 20 — Measurement, Reporting và Continuous Improvement

- [ ] **MEAS-001** GSC dimensions/filter/date và GA4 scope được ghi rõ.
- [ ] **MEAS-002** Tách brand/non-brand, market, device, page type và cohort.
- [ ] **MEAS-003** Đo visibility → qualified traffic → conversion → transaction/revenue.
- [ ] **MEAS-004** Before/after dùng cùng độ dài, weekday và seasonality phù hợp.
- [ ] **MEAS-005** Overlay promotion, paid media, release, migration và Google update.
- [ ] **MEAS-006** Control/matched pages/time-series khi khả thi.
- [ ] **MEAS-007** Missing/stale/thresholded/estimated data và confidence.
- [ ] **MEAS-008** Báo output, outcome và business impact riêng biệt.
- [ ] **MEAS-009** Dùng ngôn ngữ “ghi nhận sau/liên quan đến” nếu chưa đủ causal evidence.
- [ ] **MEAS-010** Monthly report có result, explanation, completed actions, blockers và next actions.
- [ ] **MEAS-011** Quarterly review cập nhật strategy, budget và roadmap.
- [ ] **MEAS-012** Lưu learnings và cập nhật standard/control version.

---

## 22. Module 21 — Migration, Redesign và Domain Change

- [ ] **MIG-001** Full pre-launch inventory: URL, status, metadata, canonical, hreflang, schema, links, traffic, backlinks.
- [ ] **MIG-002** Old→new URL mapping và exception review.
- [ ] **MIG-003** Staging được bảo vệ bằng auth; không dựa vào robots làm bảo mật.
- [ ] **MIG-004** Old/new parity theo template.
- [ ] **MIG-005** Redirect 1:1 đến nội dung tương đương; tránh mass redirect không liên quan.
- [ ] **MIG-006** Pre-launch crawl và critical gate.
- [ ] **MIG-007** Launch runbook, owner, rollback và war room.
- [ ] **MIG-008** Post-launch daily monitoring GSC/crawl/log/rank/analytics.
- [ ] **MIG-009** Sitemap/internal links/canonical/hreflang cập nhật URL mới.
- [ ] **MIG-010** Redirect retention và decommission plan.

---

## 23. Definition of Done cho một dự án SEO

Một dự án không “Pass SEO” chỉ vì không có lỗi technical. Trạng thái tổng thể gồm sáu gate:

| Gate | Điều kiện |
|---|---|
| 1. Data Ready | Các nguồn bắt buộc hoạt động, tracking và lineage đáng tin cậy |
| 2. Technically Eligible | Không có Critical chặn crawl/render/index/policy |
| 3. Strategically Aligned | Objective, market, keyword, page mapping và roadmap rõ |
| 4. Execution Ready | Content, authority, specialized modules và action workflow vận hành |
| 5. Verified | Thay đổi đã QA, có evidence và regression coverage |
| 6. Measurable | Có thể đo visibility đến business outcome với confidence rõ |

### Điều kiện hoàn thành

- [ ] Không còn Critical chưa xử lý.
- [ ] High đã Done hoặc Accepted Risk có người duyệt và hạn xem lại.
- [ ] Mọi module Core đã kiểm tra; module không áp dụng ghi `NOT_APPLICABLE` có lý do.
- [ ] Mọi action Done có implementation evidence và QA evidence.
- [ ] Các KPI có source, baseline, target và freshness.
- [ ] Không có claim ranking/revenue vượt quá bằng chứng.

---

## 24. Quy tắc chống checklist sai lệch

- Không bắt buộc meta keywords.
- Không dùng số ký tự title/meta description làm policy cứng.
- Không Fail vì nhiều H1 nếu structure hợp lý.
- Không coi sitemap là bảo đảm index.
- Không coi canonical là mệnh lệnh Google phải tuân theo.
- Không coi duplicate content thông thường là penalty.
- Không coi structured data là ranking boost được bảo đảm.
- Không coi DA/DR/AS/Toxic Score là metric của Google.
- Không disavow tự động.
- Không dùng word count làm quality threshold chung.
- Không coi AI content là vi phạm chỉ vì được tạo bằng AI; đánh giá value và scaled abuse.
- Không tạo E-E-A-T score giả.
- Không bảo đảm ranking khi CWV Pass.

---

## 25. Ánh xạ vào MAVRYKSEO

| Checklist layer | Sản phẩm |
|---|---|
| Modules | Feature hubs |
| Control IDs | Versioned standard registry |
| Assess items | Audit runs/findings |
| Plan/Execute items | Action Center |
| Evidence | Raw artifacts + source lineage |
| QA items | Verification records |
| Monitor items | Alerts/incidents/measurement reviews |
| N/A/Exceptions | Applicability engine |
| Source IDs | Source catalog + documentation links |

**Nguồn công việc duy nhất:** mọi detector, integration và manual review tạo observation/finding; chỉ Action Center quản lý task thực thi.


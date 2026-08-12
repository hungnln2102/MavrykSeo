# SEO Intelligence Validation

## Mục tiêu

Biến kiến thức SEO thành detector library có thể kiểm chứng và version
hóa.

## Detector contract

Mỗi detector phải có: - detector_id - business definition - input
sources - preconditions - deterministic algorithm - thresholds -
evidence - confidence - severity - priority contribution - recommended
action - detector_version - test fixtures - known limitations

## Bộ detector ưu tiên

-   CONTENT_DECAY
-   CTR_OPPORTUNITY
-   STRIKING_DISTANCE
-   CANNIBALIZATION
-   ORPHAN_PAGE
-   INTERNAL_LINK_OPPORTUNITY
-   TITLE_META_ISSUE
-   INDEXABILITY_ISSUE
-   REDIRECT_ISSUE
-   CANONICAL_ISSUE
-   COMPETITOR_GAIN
-   CONTENT_GAP
-   LOST_RANKING
-   WINNING_PAGE

## Validation

Mỗi detector cần: 1. synthetic fixtures; 2. website cases thực; 3.
expected evidence; 4. false-positive review; 5. regression tests; 6.
version comparison.

## AI

LLM dùng để giải thích/chiến lược/brief, không dùng thay deterministic
calculations.

Mọi AI recommendation lưu:
`detector_version + scoring_version + model + prompt_version + generated_at + confidence`

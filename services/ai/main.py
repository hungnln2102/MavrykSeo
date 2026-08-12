import os
import json
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import httpx

# --- Observability ---
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(
        dsn=sentry_dsn,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

app = FastAPI(title="SEO AI & NLP Service", version="1.0.0")

otel_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
if otel_endpoint:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    provider = TracerProvider()
    processor = BatchSpanProcessor(OTLPSpanExporter(endpoint=otel_endpoint))
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
    print("OpenTelemetry instrumented successfully for FastAPI")
# ---------------------


# Input Models
class SeoSignal(BaseModel):
    detector_type: str = Field(..., description="Type of detector, e.g. content_decay, ctr_opportunity, etc.")
    url: Optional[str] = Field(None, description="Target URL associated with the signal")
    keyword: Optional[str] = Field(None, description="Target keyword associated with the signal")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Metadata/metrics for the signal")

class RecommendationRequest(BaseModel):
    site_id: str
    project_id: str
    signals: List[SeoSignal]

# Output Models
class RecommendationItem(BaseModel):
    title: str = Field(..., description="SEO Action Title")
    description: str = Field(..., description="SEO Action Description explaining how to optimize")
    priority: str = Field(..., description="Priority: high, medium, low")
    impact_score: int = Field(..., ge=0, le=100, description="Estimated organic impact score (0-100)")
    effort_score: int = Field(..., ge=0, le=100, description="Estimated implementation effort score (0-100)")

class RecommendationResponse(BaseModel):
    success: bool
    recommendations: List[RecommendationItem]

# Search Intent Models
class KeywordIntentRequest(BaseModel):
    keywords: List[str]

class KeywordIntentItem(BaseModel):
    keyword: str
    intent: str

class KeywordIntentResponse(BaseModel):
    success: bool
    intents: List[KeywordIntentItem]

# Keyword Clustering Models
class KeywordSerpInput(BaseModel):
    keyword: str
    serp: List[str]

class KeywordClusterRequest(BaseModel):
    keywords: List[KeywordSerpInput]

class KeywordClusterItem(BaseModel):
    cluster_name: str
    intent: str
    keywords: List[str]

class KeywordClusterResponse(BaseModel):
    success: bool
    clusters: List[KeywordClusterItem]

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai"}

@app.post("/analyze/recommend", response_model=RecommendationResponse)
async def analyze_and_recommend(req: RecommendationRequest):
    if not req.signals:
        return RecommendationResponse(success=True, recommendations=[])

    # 1. Resolve Provider and Configuration from Environment
    provider = os.getenv("AI_PROVIDER")
    api_key = os.getenv("AI_API_KEY")
    base_url = os.getenv("AI_BASE_URL")
    model = os.getenv("AI_MODEL")

    # Autodetect if provider is not explicitly set
    if not provider:
        if os.getenv("GEMINI_API_KEY"):
            provider = "gemini"
            api_key = os.getenv("GEMINI_API_KEY")
        elif os.getenv("ANTHROPIC_API_KEY"):
            provider = "anthropic"
            api_key = os.getenv("ANTHROPIC_API_KEY")
        elif os.getenv("OPENAI_API_KEY"):
            provider = "openai"
            api_key = os.getenv("OPENAI_API_KEY")
        elif base_url:
            provider = "custom"
        else:
            provider = "mock"

    if not api_key and provider in ["openai", "gemini", "anthropic"]:
        # Try generic key if provider-specific key is not set
        api_key = os.getenv("AI_API_KEY")

    print(f"Routing recommendation request to AI Provider: '{provider}'")

    # 2. Invoke resolved provider
    if provider == "mock":
        return generate_local_recommendations(req.signals)

    try:
        if provider == "gemini":
            selected_model = model or "gemini-1.5-flash"
            return await generate_gemini_recommendations(req.signals, api_key, selected_model)
        elif provider == "anthropic":
            selected_model = model or "claude-3-5-sonnet-20241022"
            return await generate_anthropic_recommendations(req.signals, api_key, selected_model)
        elif provider == "openai":
            selected_model = model or "gpt-4o-mini"
            return await generate_openai_recommendations(req.signals, api_key, selected_model, base_url)
        elif provider == "custom":
            selected_model = model or "custom-model"
            return await generate_openai_recommendations(req.signals, api_key, selected_model, base_url)
        else:
            print(f"Unknown provider '{provider}'. Falling back to local generation.")
            return generate_local_recommendations(req.signals)
    except Exception as e:
        print(f"AI Provider '{provider}' failed with error: {str(e)}. Falling back to local generation.")
        return generate_local_recommendations(req.signals)

def build_prompt(signals: List[SeoSignal]) -> str:
    signals_data = []
    for s in signals:
        signals_data.append({
            "type": s.detector_type,
            "url": s.url,
            "keyword": s.keyword,
            "metrics": s.metrics
        })
        
    return f"""
You are an expert SEO AI consultant. You will analyze a set of rule-based SEO signals and output a JSON array of actionable recommendations.
Each recommendation must be tailored specifically to fix the problems identified in the signals.

Here are the input SEO signals:
{json.dumps(signals_data, indent=2)}

You MUST respond strictly with a JSON object containing a "recommendations" key with a list of objects.
Each object must match this schema:
{{
  "title": "Short title of the recommendation",
  "description": "Clear step-by-step description of what to do and why it helps",
  "priority": "high" | "medium" | "low",
  "impact_score": 1-100,
  "effort_score": 1-100
}}

Do not return any markdown wraps or comments. Only raw JSON.
"""

async def generate_gemini_recommendations(signals: List[SeoSignal], api_key: str, model: str) -> RecommendationResponse:
    if not api_key:
        raise ValueError("Gemini API key is not configured")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    prompt = build_prompt(signals)

    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, timeout=30.0)
        response.raise_for_status()
        data = response.json()

    try:
        text_response = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text_response)
        return parse_recommendations(parsed)
    except Exception as e:
        raise ValueError(f"Failed to parse Gemini response: {str(e)}. Raw response: {data}")

async def generate_anthropic_recommendations(signals: List[SeoSignal], api_key: str, model: str) -> RecommendationResponse:
    if not api_key:
        raise ValueError("Anthropic API key is not configured")

    url = "https://api.anthropic.com/v1/messages"
    prompt = build_prompt(signals)

    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    payload = {
        "model": model,
        "max_tokens": 2048,
        "messages": [{"role": "user", "content": prompt}]
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=30.0)
        response.raise_for_status()
        data = response.json()

    try:
        text_response = data["content"][0]["text"]
        # Find JSON boundaries just in case Claude wraps it in extra text
        start_idx = text_response.find("{")
        end_idx = text_response.rfind("}") + 1
        json_str = text_response[start_idx:end_idx]
        parsed = json.loads(json_str)
        return parse_recommendations(parsed)
    except Exception as e:
        raise ValueError(f"Failed to parse Anthropic response: {str(e)}")

async def generate_openai_recommendations(signals: List[SeoSignal], api_key: str, model: str, base_url: Optional[str]) -> RecommendationResponse:
    url = f"{base_url.rstrip('/')}/chat/completions" if base_url else "https://api.openai.com/v1/chat/completions"
    prompt = build_prompt(signals)

    headers = {
        "Content-Type": "application/json"
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a structured output assistant."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=30.0)
        response.raise_for_status()
        data = response.json()

    try:
        text_response = data["choices"][0]["message"]["content"]
        parsed = json.loads(text_response)
        return parse_recommendations(parsed)
    except Exception as e:
        raise ValueError(f"Failed to parse OpenAI response: {str(e)}")

def parse_recommendations(parsed_data: Dict[str, Any]) -> RecommendationResponse:
    recs = []
    for item in parsed_data.get("recommendations", []):
        recs.append(RecommendationItem(
            title=item.get("title", ""),
            description=item.get("description", ""),
            priority=item.get("priority", "medium"),
            impact_score=item.get("impact_score", 50),
            effort_score=item.get("effort_score", 50)
        ))
    return RecommendationResponse(success=True, recommendations=recs)

def generate_local_recommendations(signals: List[SeoSignal]) -> RecommendationResponse:
    recs = []
    for s in signals:
        dtype = s.detector_type.lower()
        
        if dtype == "content_decay":
            url_str = s.url or "target page"
            clicks_drop = s.metrics.get("clicks_drop_percent", 0)
            if clicks_drop is None:
                clicks_drop = 0.0
            recs.append(RecommendationItem(
                title=f"Refresh decaying content for {url_str}",
                description=f"This page has seen a {clicks_drop:.1f}% drop in search clicks compared to the previous month. Update out-of-date information, check for broken links, and expand sections that cover newly searched search queries.",
                priority="high",
                impact_score=85,
                effort_score=40
            ))
            
        elif dtype == "ctr_opportunity":
            kw = s.keyword or "target query"
            url_str = s.url or "page"
            ctr = s.metrics.get("ctr", 0)
            recs.append(RecommendationItem(
                title=f"Optimize CTR for keyword '{kw}'",
                description=f"Your page ranks on page 1 for '{kw}' (Impressions: {s.metrics.get('impressions', 0)}), but has a below-average CTR of {ctr * 100:.1f}%. Rewrite the meta title and description to be more click-compelling, and test structured schema tags.",
                priority="high",
                impact_score=90,
                effort_score=20
            ))
            
        elif dtype == "striking_distance":
            kw = s.keyword or "target query"
            pos = s.metrics.get("position", 0)
            recs.append(RecommendationItem(
                title=f"Push striking distance keyword '{kw}' to page 1",
                description=f"Your page ranks on page 2 (Position {pos:.1f}) for '{kw}'. Add contextual internal links pointing to the page using optimized anchor text, and verify that the target keyword is placed in the H1 and intro paragraphs.",
                priority="medium",
                impact_score=75,
                effort_score=30
            ))
            
        elif dtype == "cannibalization":
            kw = s.keyword or "target query"
            urls = s.metrics.get("urls", [])
            urls_str = ", ".join(urls) if urls else "multiple URLs"
            recs.append(RecommendationItem(
                title=f"Resolve keyword cannibalization for '{kw}'",
                description=f"Multiple URLs on your site ({urls_str}) are competing and ranking for the same keyword '{kw}'. Consolidate duplicate content, implement canonical tags targeting the preferred URL, or differentiate the content topics.",
                priority="medium",
                impact_score=70,
                effort_score=50
            ))
            
        elif dtype == "orphan_page":
            url_str = s.url or "target page"
            recs.append(RecommendationItem(
                title=f"Link orphan page {url_str} to site structure",
                description=f"The URL {url_str} has been crawled but has 0 internal links pointing to it from other crawled pages. Add internal links from relevant parent pages to ensure search engine crawlers can index it and pass page equity.",
                priority="high",
                impact_score=80,
                effort_score=15
            ))
            
        elif dtype == "title_meta_issue":
            url_str = s.url or "target page"
            issue_type = s.metrics.get("issue_type", "issue")
            length = s.metrics.get("length", 0)
            
            if issue_type == "missing_title":
                title = f"Add missing SEO title tag for {url_str}"
                desc = f"The page {url_str} is missing a title tag. Create a unique, descriptive title tag between 30 and 60 characters to improve search engine relevance and user click-through rate."
                priority = "high"
                impact = 80
                effort = 10
            elif issue_type == "duplicate_title":
                title = f"Resolve duplicate title tag for {url_str}"
                desc = f"The page {url_str} shares a duplicate title tag with other pages on your site. Rewrite the title to be completely unique and highly descriptive of the page content."
                priority = "medium"
                impact = 70
                effort = 15
            elif issue_type == "too_long_title":
                title = f"Shorten title tag for {url_str}"
                desc = f"The title tag for {url_str} is {length} characters long, which exceeds the recommended 60-character limit. Shorten the title to prevent truncation in search result pages."
                priority = "low"
                impact = 40
                effort = 10
            elif issue_type == "too_short_title":
                title = f"Lengthen title tag for {url_str}"
                desc = f"The title tag for {url_str} is only {length} characters. Expand the title (recommended 30-60 characters) to include primary keywords and improve click attractiveness."
                priority = "low"
                impact = 35
                effort = 10
            elif issue_type == "missing_description":
                title = f"Add missing meta description for {url_str}"
                desc = f"The page {url_str} is missing a meta description. Write an engaging summary (between 70 and 160 characters) that outlines the page content and invites user clicks."
                priority = "high"
                impact = 75
                effort = 10
            elif issue_type == "duplicate_description":
                title = f"Resolve duplicate meta description for {url_str}"
                desc = f"The page {url_str} shares its meta description with other pages. Create a unique description reflecting this specific page's value."
                priority = "medium"
                impact = 65
                effort = 15
            elif issue_type == "too_long_description":
                title = f"Shorten meta description for {url_str}"
                desc = f"The meta description for {url_str} is {length} characters long, exceeding the 160-character limit. Trim it to prevent search snippet truncation."
                priority = "low"
                impact = 35
                effort = 10
            elif issue_type == "too_short_description":
                title = f"Lengthen meta description for {url_str}"
                desc = f"The meta description for {url_str} is only {length} characters. Expand the summary (recommended 70-160 characters) to better explain the page content."
                priority = "low"
                impact = 30
                effort = 10
            else:
                title = f"Optimize title and meta tags for {url_str}"
                desc = f"Ensure title and meta description tags are unique, relevant, and adhere to recommended length limits."
                priority = "medium"
                impact = 50
                effort = 10

            recs.append(RecommendationItem(
                title=title,
                description=desc,
                priority=priority,
                impact_score=impact,
                effort_score=effort
            ))
            
        elif dtype == "redirect_issue":
            url_str = s.url or "target page"
            issue_type = s.metrics.get("issue_type", "issue")
            status_code = s.metrics.get("status_code", 301)
            
            if issue_type == "redirect_loop":
                title = f"Resolve critical redirect loop for {url_str}"
                desc = f"The URL {url_str} is caught in a redirect loop or exceeds maximum redirect limits (status code {status_code}). This prevents users and search engine crawlers from accessing the content. Check your server redirect configurations and resolve the loop."
                priority = "high"
                impact = 90
                effort = 20
            elif issue_type == "multiple_redirects":
                title = f"Consolidate redirect chain for {url_str}"
                desc = f"The URL {url_str} redirects through multiple intermediate hops before reaching its destination. This increases load times and wastes crawl budget. Update internal links to point directly to the destination URL."
                priority = "medium"
                impact = 60
                effort = 15
            elif issue_type == "temporary_redirect":
                title = f"Change temporary redirect (302/307) to permanent (301) for {url_str}"
                desc = f"The URL {url_str} uses a temporary redirect ({status_code}) to redirect traffic. Temporary redirects do not pass link equity (PageRank) to the destination. Update this to a permanent 301 or 308 redirect if the move is permanent."
                priority = "low"
                impact = 50
                effort = 10
            else:
                title = f"Optimize redirects for {url_str}"
                desc = f"Verify that the redirect is necessary, points directly to the target URL, uses 301 for permanent redirects, and does not form loops."
                priority = "low"
                impact = 40
                effort = 10
                
            recs.append(RecommendationItem(
                title=title,
                description=desc,
                priority=priority,
                impact_score=impact,
                effort_score=effort
            ))
            
        elif dtype == "canonical_issue":
            url_str = s.url or "target page"
            issue_type = s.metrics.get("issue_type", "issue")
            canonical_url = s.metrics.get("canonical_url", "")
            
            if issue_type == "missing_canonical":
                title = f"Add missing canonical tag for {url_str}"
                desc = f"The page {url_str} is missing a canonical URL link tag. Adding a self-referential canonical tag prevents duplicate content search penalties and clarifies the preferred version of the URL."
                priority = "medium"
                impact = 70
                effort = 10
            elif issue_type == "canonical_mismatch":
                title = f"Fix canonical domain or protocol mismatch for {url_str}"
                desc = f"The canonical URL ({canonical_url}) on {url_str} points to a different domain or uses an incorrect protocol (e.g., HTTP instead of HTTPS). Ensure that all canonical tags reference your correct primary secure URL."
                priority = "medium"
                impact = 65
                effort = 10
            elif issue_type == "canonical_broken":
                title = f"Resolve broken canonical target for {url_str}"
                desc = f"The canonical URL ({canonical_url}) on {url_str} points to a broken page that returns an HTTP error status code. A canonical tag must always target a live, accessible page (status 200 OK)."
                priority = "high"
                impact = 80
                effort = 15
            elif issue_type == "canonical_redirect":
                title = f"Correct canonical pointing to redirect for {url_str}"
                desc = f"The canonical URL ({canonical_url}) on {url_str} points to a page that redirects. Canonical URLs should reference the direct, final 200 OK destination page to avoid wasting crawl budget and routing link juice."
                priority = "low"
                impact = 45
                effort = 10
            elif issue_type == "canonical_loop":
                title = f"Resolve canonical loop/cross-link for {url_str}"
                desc = f"A canonical loop or cross-reference loop was detected starting at {url_str} (pointing to {canonical_url} which points back to this page). This prevents search engines from indexing either page. Resolve the reference so only the primary version is targeted."
                priority = "high"
                impact = 85
                effort = 15
            else:
                title = f"Optimize canonical configurations for {url_str}"
                desc = f"Ensure the canonical tag points to a valid, live URL on the same domain and protocol without redirecting or looping."
                priority = "medium"
                impact = 50
                effort = 10
                
            recs.append(RecommendationItem(
                title=title,
                description=desc,
                priority=priority,
                impact_score=impact,
                effort_score=effort
            ))
            
        elif dtype == "indexability_issue":
            url_str = s.url or "target page"
            issue_type = s.metrics.get("issue_type", "issue")
            
            if issue_type == "robots_blocked_with_traffic":
                title = f"Unblock robots.txt for active URL {url_str}"
                desc = f"The page {url_str} is blocked by robots.txt rules but has historical organic traffic. This will block search engine crawlers, causing the page to be deindexed and losing organic traffic. Remove the disallow rules in robots.txt."
                priority = "high"
                impact = 85
                effort = 10
            elif issue_type == "robots_blocked_in_sitemap":
                title = f"Resolve robots.txt block for sitemap URL {url_str}"
                desc = f"The page {url_str} is in your sitemap but is blocked by robots.txt rules. Sitemaps should only contain crawlable and indexable URLs. Either unblock the URL in robots.txt or remove it from the sitemap."
                priority = "medium"
                impact = 65
                effort = 10
            elif issue_type == "noindex_with_traffic":
                title = f"Remove noindex meta tag from active URL {url_str}"
                desc = f"The page {url_str} has a 'noindex' meta robots tag but has historical organic traffic. Having noindex will cause search engines to deindex the page, wiping out its organic visibility. Remove the 'noindex' tag."
                priority = "high"
                impact = 85
                effort = 10
            elif issue_type == "noindex_in_sitemap":
                title = f"Resolve noindex meta tag for sitemap URL {url_str}"
                desc = f"The page {url_str} is included in your sitemap but contains a 'noindex' meta tag. Sitemap pages must be indexable. Either remove the 'noindex' tag to allow indexing, or remove the URL from the sitemap."
                priority = "medium"
                impact = 65
                effort = 10
            else:
                title = f"Optimize indexability configuration for {url_str}"
                desc = f"Ensure the page is crawlable by search engines if it is intended to receive search traffic or be included in the sitemap."
                priority = "medium"
                impact = 50
                effort = 10
                
            recs.append(RecommendationItem(
                title=title,
                description=desc,
                priority=priority,
                impact_score=impact,
                effort_score=effort
            ))
            
        elif dtype == "internal_link_opportunity":
            url_str = s.url or "source page"
            target_url = s.metrics.get("target_url", "")
            keyword = s.keyword or "keyword"
            rank = s.metrics.get("rank", 20)
            
            title = f"Add internal link from {url_str} to target page"
            desc = f"The page {url_str} mentions the high-potential keyword '{keyword}' (which ranks at position #{rank} for {target_url}) but does not link to it. Adding an internal link from {url_str} to {target_url} with anchor text '{keyword}' will distribute PageRank and improve search visibility."
            
            recs.append(RecommendationItem(
                title=title,
                description=desc,
                priority="medium",
                impact_score=70,
                effort_score=15
            ))
            
        elif dtype == "competitor_gain":
            keyword = s.keyword or "keyword"
            url_str = s.url or "competitor page"
            competitor_domain = s.metrics.get("competitor_domain", "")
            competitor_rank = s.metrics.get("competitor_rank", 1)
            previous_rank = s.metrics.get("previous_rank", 10)
            own_rank = s.metrics.get("own_rank", 0)
            
            title = f"Mitigate competitor gain for keyword '{keyword}'"
            desc = f"Competitor {competitor_domain} has jumped to position #{competitor_rank} (previously #{previous_rank}) for the keyword '{keyword}', outranking your page (position #{own_rank}). Review their content and schema markup to reclaim your ranking."
            
            recs.append(RecommendationItem(
                title=title,
                description=desc,
                priority="high",
                impact_score=80,
                effort_score=20
            ))
            
        elif dtype == "lost_ranking":
            keyword = s.keyword or "keyword"
            url_str = s.url or "your page"
            latest_rank = s.metrics.get("latest_rank", 1)
            previous_rank = s.metrics.get("previous_rank", 1)
            drop_magnitude = s.metrics.get("drop_magnitude", 0)
            
            title = f"Recover ranking drop for keyword '{keyword}' on {url_str}"
            desc = f"The keyword '{keyword}' ranking for {url_str} dropped from position #{previous_rank} to #{latest_rank} (a drop of {drop_magnitude} spots). Investigate for indexation issues, search intent shifts, or outdated content."
            
            recs.append(RecommendationItem(
                title=title,
                description=desc,
                priority="high",
                impact_score=85,
                effort_score=15
            ))
            
        elif dtype == "winning_page":
            url_str = s.url or "your page"
            clicks_recent = s.metrics.get("clicks_recent", 0)
            growth_rate = s.metrics.get("growth_rate", 0.0)
            growth_rate_pct = int(growth_rate * 100)
            
            title = f"Capitalize on traffic growth for winning page {url_str}"
            desc = f"The page {url_str} has shown strong search performance growth (growth rate: {growth_rate_pct}%). Leverage this momentum by adding internal links from it to other high-value target pages or adding related secondary keywords to the content."
            
            recs.append(RecommendationItem(
                title=title,
                description=desc,
                priority="medium",
                impact_score=75,
                effort_score=10
            ))
            
    return RecommendationResponse(success=True, recommendations=recs)

# Search Intent Classification Logic
def classify_intent_rule(keyword: str) -> str:
    kw = keyword.lower().strip()
    # Transactional Rules
    transactional_words = ["buy", "purchase", "order", "pricing", "price", "cheap", "coupon", "discount", "sale", "hire", "shop", "checkout"]
    # Commercial Rules
    commercial_words = ["best", "review", "reviews", "comparison", "compare", "versus", "vs", "top", "alternative", "alternatives"]
    # Informational Rules
    informational_words = ["how", "what", "why", "where", "who", "guide", "tutorial", "learn", "tips", "info", "information", "definition", "example", "examples"]
    # Navigational Rules
    navigational_words = ["login", "signin", "portal", "website", "facebook", "twitter", "google", "mavryk", "github"]

    for word in transactional_words:
        if word in kw:
            return "transactional"
    for word in commercial_words:
        if word in kw:
            return "commercial"
    for word in informational_words:
        if word in kw:
            return "informational"
    for word in navigational_words:
        if word in kw:
            return "navigational"
            
    # Default fallback
    return "informational"

@app.post("/analyze/intent", response_model=KeywordIntentResponse)
def analyze_intent(req: KeywordIntentRequest):
    intents = []
    for kw in req.keywords:
        intents.append(KeywordIntentItem(
            keyword=kw,
            intent=classify_intent_rule(kw)
        ))
    return KeywordIntentResponse(success=True, intents=intents)

@app.post("/keywords/cluster", response_model=KeywordClusterResponse)
def cluster_keywords(req: KeywordClusterRequest):
    if not req.keywords:
        return KeywordClusterResponse(success=True, clusters=[])

    items = req.keywords
    n = len(items)
    parent = list(range(n))

    def find(i):
        if parent[i] == i:
            return i
        parent[i] = find(parent[i])
        return parent[i]

    def union(i, j):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            parent[root_i] = root_j

    # Compute URL sets
    url_sets = []
    for item in items:
        urls = set()
        for url in item.serp:
            norm = url.lower().strip().rstrip("/")
            norm = norm.replace("://www.", "://")
            urls.add(norm)
        url_sets.append(urls)

    # Perform Union-Find based on overlap threshold of >= 3 URLs
    for i in range(n):
        for j in range(i + 1, n):
            overlap = url_sets[i].intersection(url_sets[j])
            if len(overlap) >= 3:
                union(i, j)

    # Group by roots
    clusters_map = {}
    for i in range(n):
        root = find(i)
        if root not in clusters_map:
            clusters_map[root] = []
        clusters_map[root].append(items[i].keyword)

    # Build final response
    clusters = []
    for root, kws in clusters_map.items():
        representative = min(kws, key=len)
        intent = classify_intent_rule(representative)
        clusters.append(KeywordClusterItem(
            cluster_name=representative,
            intent=intent,
            keywords=kws
        ))

    return KeywordClusterResponse(success=True, clusters=clusters)

# Brief Generation & Content Optimization Models
class BriefOutlineItem(BaseModel):
    heading: str = Field(..., description="Heading text")
    level: str = Field(..., description="Heading level: h1, h2, h3")

class CompetitorOutline(BaseModel):
    url: str = Field(..., description="Competitor URL")
    headings: List[BriefOutlineItem] = Field(..., description="Headings found on competitor page")

class BriefGenerateRequest(BaseModel):
    primary_keyword: str = Field(..., description="Primary keyword to generate the brief for")
    secondary_keywords: List[str] = Field(default_factory=list, description="List of secondary keywords to target")
    competitor_urls: List[str] = Field(default_factory=list, description="List of competitor URLs to analyze")

class BriefGenerateResponse(BaseModel):
    success: bool
    target_word_count: int
    outline: List[BriefOutlineItem]
    competitor_outlines: List[CompetitorOutline]
    seo_instructions: str

class BriefOptimizeRequest(BaseModel):
    body_text: str = Field(..., description="The article draft content")
    primary_keyword: str = Field(..., description="The target primary keyword")
    secondary_keywords: List[str] = Field(default_factory=list, description="The secondary keywords list")
    brief_outline: List[str] = Field(default_factory=list, description="Expected headings text from outline")

class KeywordCoverageItem(BaseModel):
    keyword: str
    count: int

class BriefOptimizeResponse(BaseModel):
    success: bool
    word_count: int
    primary_keyword_density: float
    secondary_keyword_coverage: List[KeywordCoverageItem]
    heading_compliance: float
    score: int
    suggestions: List[str]


def generate_local_brief(req: BriefGenerateRequest) -> BriefGenerateResponse:
    kw = req.primary_keyword
    target_wc = max(1200, min(2500, len(kw) * 120 + 800))
    
    # Title-case keyword
    title_kw = kw.title()
    
    outline = [
        BriefOutlineItem(heading=f"Complete Guide to {title_kw}", level="h1"),
        BriefOutlineItem(heading=f"Introduction to {title_kw}", level="h2"),
        BriefOutlineItem(heading=f"Why {title_kw} is Essential for Success", level="h2"),
        BriefOutlineItem(heading="Key Concepts and Fundamentals", level="h3"),
        BriefOutlineItem(heading="Top Tips and Best Practices", level="h2"),
        BriefOutlineItem(heading="Common Pitfalls to Avoid", level="h2"),
        BriefOutlineItem(heading="Conclusion", level="h2")
    ]
    
    competitors = []
    for idx, url in enumerate(req.competitor_urls or ["http://competitor-one.com", "http://competitor-two.com"]):
        competitors.append(CompetitorOutline(
            url=url,
            headings=[
                BriefOutlineItem(heading=f"Competitor Guide: {title_kw}", level="h1"),
                BriefOutlineItem(heading=f"What is {title_kw}?", level="h2"),
                BriefOutlineItem(heading="Our Top 5 Recommendations", level="h2"),
            ]
        ))
        
    sec_kws_str = ", ".join(req.secondary_keywords) if req.secondary_keywords else "related terms"
    instructions = (
        f"1. Target Word Count: Aim for at least {target_wc} words.\n"
        f"2. Primary Keyword Density: Keep '{kw}' density between 1.0% and 2.5%.\n"
        f"3. Heading Integration: Integrate secondary keywords ({sec_kws_str}) naturally inside your subheadings.\n"
        f"4. Structure: Ensure you include clear H2 and H3 sections as outlined in the brief structure."
    )
    
    return BriefGenerateResponse(
        success=True,
        target_word_count=target_wc,
        outline=outline,
        competitor_outlines=competitors,
        seo_instructions=instructions
    )


def build_brief_prompt(req: BriefGenerateRequest) -> str:
    return f"""
You are an expert SEO content strategist. Create a highly optimized, structured content brief for the primary keyword "{req.primary_keyword}".
Secondary keywords to cover: {json.dumps(req.secondary_keywords)}
Competitor URLs: {json.dumps(req.competitor_urls)}

You MUST respond strictly with a JSON object. Do not wrap in markdown or write additional text.
The JSON object must have this structure:
{{
  "target_word_count": 1500,
  "outline": [
    {{ "heading": "Heading Text", "level": "h1" | "h2" | "h3" }},
    ...
  ],
  "competitor_outlines": [
    {{
      "url": "http://example.com",
      "headings": [
        {{ "heading": "Competitor Heading Text", "level": "h1" | "h2" | "h3" }}
      ]
    }}
  ],
  "seo_instructions": "Detailed SEO guidelines, keyword usage rules, formatting tips."
}}
"""

async def generate_gemini_brief(req: BriefGenerateRequest, api_key: str, model: str) -> BriefGenerateResponse:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    prompt = build_brief_prompt(req)
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, timeout=30.0)
        response.raise_for_status()
        data = response.json()
    text_response = data["candidates"][0]["content"]["parts"][0]["text"]
    parsed = json.loads(text_response)
    return parse_brief_response(parsed)

async def generate_anthropic_brief(req: BriefGenerateRequest, api_key: str, model: str) -> BriefGenerateResponse:
    url = "https://api.anthropic.com/v1/messages"
    prompt = build_brief_prompt(req)
    headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
    payload = {"model": model, "max_tokens": 2048, "messages": [{"role": "user", "content": prompt}]}
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=30.0)
        response.raise_for_status()
        data = response.json()
    text_response = data["content"][0]["text"]
    start_idx = text_response.find("{")
    end_idx = text_response.rfind("}") + 1
    parsed = json.loads(text_response[start_idx:end_idx])
    return parse_brief_response(parsed)

async def generate_openai_brief(req: BriefGenerateRequest, api_key: str, model: str, base_url: Optional[str]) -> BriefGenerateResponse:
    url = f"{base_url.rstrip('/')}/chat/completions" if base_url else "https://api.openai.com/v1/chat/completions"
    prompt = build_brief_prompt(req)
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a structured output assistant."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=30.0)
        response.raise_for_status()
        data = response.json()
    text_response = data["choices"][0]["message"]["content"]
    parsed = json.loads(text_response)
    return parse_brief_response(parsed)

def parse_brief_response(parsed: Dict[str, Any]) -> BriefGenerateResponse:
    outline = [BriefOutlineItem(heading=o.get("heading", ""), level=o.get("level", "h2")) for o in parsed.get("outline", [])]
    competitors = []
    for comp in parsed.get("competitor_outlines", []):
        comp_headings = [BriefOutlineItem(heading=o.get("heading", ""), level=o.get("level", "h2")) for o in comp.get("headings", [])]
        competitors.append(CompetitorOutline(url=comp.get("url", ""), headings=comp_headings))
    return BriefGenerateResponse(
        success=True,
        target_word_count=parsed.get("target_word_count", 1500),
        outline=outline,
        competitor_outlines=competitors,
        seo_instructions=parsed.get("seo_instructions", "")
    )


@app.post("/brief/generate", response_model=BriefGenerateResponse)
async def api_generate_brief(req: BriefGenerateRequest):
    provider = os.getenv("AI_PROVIDER")
    api_key = os.getenv("AI_API_KEY")
    base_url = os.getenv("AI_BASE_URL")
    model = os.getenv("AI_MODEL")

    if not provider:
        if os.getenv("GEMINI_API_KEY"):
            provider = "gemini"
            api_key = os.getenv("GEMINI_API_KEY")
        elif os.getenv("ANTHROPIC_API_KEY"):
            provider = "anthropic"
            api_key = os.getenv("ANTHROPIC_API_KEY")
        elif os.getenv("OPENAI_API_KEY"):
            provider = "openai"
            api_key = os.getenv("OPENAI_API_KEY")
        elif base_url:
            provider = "custom"
        else:
            provider = "mock"

    if not api_key and provider in ["openai", "gemini", "anthropic"]:
        api_key = os.getenv("AI_API_KEY")

    if provider == "mock":
        return generate_local_brief(req)

    try:
        if provider == "gemini":
            selected_model = model or "gemini-1.5-flash"
            return await generate_gemini_brief(req, api_key, selected_model)
        elif provider == "anthropic":
            selected_model = model or "claude-3-5-sonnet-20241022"
            return await generate_anthropic_brief(req, api_key, selected_model)
        elif provider == "openai":
            selected_model = model or "gpt-4o-mini"
            return await generate_openai_brief(req, api_key, selected_model, base_url)
        elif provider == "custom":
            selected_model = model or "custom-model"
            return await generate_openai_brief(req, api_key, selected_model, base_url)
        else:
            return generate_local_brief(req)
    except Exception as e:
        print(f"Brief generation provider '{provider}' failed: {str(e)}. Falling back to mock brief.")
        return generate_local_brief(req)


@app.post("/brief/optimize", response_model=BriefOptimizeResponse)
def api_optimize_brief(req: BriefOptimizeRequest):
    body = req.body_text or ""
    words = body.split()
    word_count = len(words)
    
    # 1. Primary keyword density
    pk = req.primary_keyword.lower().strip()
    pk_count = 0
    if pk:
        # Search count case-insensitively
        body_lower = body.lower()
        pk_count = body_lower.count(pk)
        
    pk_density = (pk_count / max(1, word_count)) * 100
    
    # 2. Secondary keywords coverage
    sec_coverage = []
    sec_covered_count = 0
    for kw in req.secondary_keywords:
        kw_clean = kw.lower().strip()
        count = body.lower().count(kw_clean) if kw_clean else 0
        sec_coverage.append(KeywordCoverageItem(keyword=kw, count=count))
        if count > 0:
            sec_covered_count += 1
            
    # 3. Heading compliance
    headings_found = 0
    total_headings = len(req.brief_outline)
    for heading in req.brief_outline:
        # Simple match: is the heading text present inside the body
        if heading.lower().strip() in body.lower():
            headings_found += 1
            
    heading_compliance = (headings_found / max(1, total_headings)) * 100
    
    # 4. Score Calculation (Max 100)
    # Density Score (Max 30)
    density_score = 0
    if 0.5 <= pk_density <= 2.5:
        density_score = 30
    elif 0 < pk_density < 0.5:
        density_score = int((pk_density / 0.5) * 30)
    elif 2.5 < pk_density <= 4.0:
        # Penalize stuffing slightly
        density_score = max(10, 30 - int((pk_density - 2.5) * 10))
    elif pk_density > 4.0:
        density_score = 5
        
    # Word Count Score (Max 30)
    wc_score = min(30, int((word_count / 1500) * 30))
    
    # Secondary Keyword Score (Max 20)
    sec_pct = (sec_covered_count / max(1, len(req.secondary_keywords)))
    sec_score = int(sec_pct * 20)
    
    # Heading Compliance Score (Max 20)
    hd_score = int((heading_compliance / 100) * 20)
    
    total_score = min(100, density_score + wc_score + sec_score + hd_score)
    if word_count == 0:
        total_score = 0

    # 5. Suggestions
    suggestions = []
    if word_count == 0:
        suggestions.append("Start writing content to receive real-time SEO feedback.")
    else:
        if pk_count == 0:
            suggestions.append(f"Add your primary keyword '{req.primary_keyword}' to the content body.")
        elif pk_density < 1.0:
            suggestions.append(f"Increase frequency of primary keyword '{req.primary_keyword}' to reach target density (current: {pk_density:.1f}%).")
        elif pk_density > 2.5:
            suggestions.append(f"Keyword stuffing warning: Reduce occurrences of '{req.primary_keyword}' (current density: {pk_density:.1f}%).")
            
        if word_count < 1000:
            suggestions.append(f"Word count is low ({word_count} words). Aim for at least 1,200 words for better topical authority.")
            
        for item in sec_coverage:
            if item.count == 0:
                suggestions.append(f"Include secondary keyword: '{item.keyword}'")
                
        for heading in req.brief_outline:
            if heading.lower().strip() not in body.lower():
                suggestions.append(f"Add H2/H3 subheading matching: '{heading}'")

    return BriefOptimizeResponse(
        success=True,
        word_count=word_count,
        primary_keyword_density=round(pk_density, 2),
        secondary_keyword_coverage=sec_coverage,
        heading_compliance=round(heading_compliance, 2),
        score=total_score,
        suggestions=suggestions
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8083, reload=True)


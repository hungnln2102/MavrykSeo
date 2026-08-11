import os
import json
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import httpx

app = FastAPI(title="SEO AI & NLP Service", version="1.0.0")

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
            
    return RecommendationResponse(success=True, recommendations=recs)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8083, reload=True)

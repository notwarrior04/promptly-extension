from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from gemini_handler import call_gemini, classify_webpage_content
import httpx
from bs4 import BeautifulSoup
from langdetect import detect
import validators
import asyncio
from pydantic import BaseModel

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache
cache = {}
cache_lock = asyncio.Lock()

# Simple rate-limiter
gemini_queue = asyncio.Queue(maxsize=3)

# --------- FETCH WEBSITE CONTENT ---------
async def fetch_website_text(url: str) -> str:
    if not validators.url(url):
        return "[ERROR] Invalid URL provided."

    async with cache_lock:
        if url in cache:
            return cache[url]

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")
            for tag in soup(["script", "style", "header", "footer", "nav"]):
                tag.decompose()

            text = soup.get_text(separator=" ", strip=True)
            content = text[:12000]

            async with cache_lock:
                cache[url] = content

            return content
    except Exception as e:
        return f"[ERROR] Could not fetch content: {e}"

# --------- CHAT ENDPOINT ---------
@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_prompt = data.get("prompt", "").strip()
    context_raw = data.get("context", "").strip()

    # Validate format
    if not context_raw.startswith("Website: ") or "Language: " not in context_raw:
        return {
            "response": "Invalid context format. Expected:\nWebsite: <url>\\nLanguage: <optional language>"
        }

    try:
        url = context_raw.split("Website: ")[1].split("\n")[0].strip()
    except Exception:
        return {
            "response": "Invalid context format. Expected:\nWebsite: <url>\\nLanguage: <optional language>"
        }

    print("🔗 URL received:", url)

    website_text = await fetch_website_text(url)
    print("📄 Website content snippet:", website_text[:300])

    if website_text.startswith("[ERROR]"):
        return {"response": website_text}

    final_prompt = f"{user_prompt}\n\n---\nWebsite Content:\n{website_text}"
    final_prompt += "\n\nDONT USE SPECIAL-CASE CHARACTERS LIKE ASTERISKS AND UNDERSCORES FOR TEXT-STYLING! USE PLAIN CLEAN TEXT ONLY! USE NUMBERS (1.,2.,3.,...) AND ROMAN NUMBERS (IF NEEDED) FOR KEYPOINTS AND NUMBERING!\n\n"

    await gemini_queue.put(1)
    try:
        response = await call_gemini(final_prompt, context_raw)
    finally:
        gemini_queue.get_nowait()
        gemini_queue.task_done()

    return {"response": response}

# --------- CLASSIFY ENDPOINT ---------
class PageContent(BaseModel):
    content: str

@app.post("/classify")
async def classify_page(data: PageContent):
    classification = classify_webpage_content(data.content)
    return {"classification": classification}

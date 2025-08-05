import re
import httpx
from gemini_config import GEMINI_API_KEY


# Detect base64 image in context (optional visual support)
def extract_base64_snippet(context: str) -> str:
    match = re.search(r"(data:image/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)", context)
    if match:
        return f"[An image is attached as base64: {match.group(1)[:200]}... (truncated)]"
    return ""


# Async function for general prompts
async def call_gemini(prompt, context=""):
    url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent"

    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY
    }

    # If image exists, include it as part of the descriptive context
    base64_note = extract_base64_snippet(context)

    data = {
        "contents": [
            {
                "parts": [
                    {
                        "text": f"{prompt}\n\nContext:\n{context}\n\n{base64_note}"
                    }
                ]
            }
        ]
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, json=data)

        print("Status Code:", response.status_code)
        print("Response Body:", response.text)

        result = response.json()
        try:
            return result['candidates'][0]['content']['parts'][0]['text']
        except KeyError:
            return f"Error: {result.get('error', {}).get('message', 'Unknown issue')}"


# Sync function for classification
def classify_webpage_content(content: str) -> str:
    import requests

    url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent"
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY
    }

    prompt = f"""
    Analyze the following webpage content and classify it as one of:
    - e-commerce
    - article/blog
    - wiki/reference
    - other

    Respond with just the category name.

    Content:
    {content[:3000]}
    """

    data = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }

    response = requests.post(url, headers=headers, json=data)
    print("Classification Status Code:", response.status_code)
    print("Classification Response Body:", response.text)

    try:
        result = response.json()
        return result['candidates'][0]['content']['parts'][0]['text'].strip().lower()
    except Exception:
        return "other"
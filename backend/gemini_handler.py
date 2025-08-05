import httpx
from gemini_config import GEMINI_API_KEY

# --------- CALL GEMINI API ---------
async def call_gemini(prompt, context=""):
    url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent"

    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY
    }

    data = {
        "contents": [
            {
                "parts": [
                    {
                        "text": f"{prompt}\n\nContext:\n{context}"
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

# --------- CLASSIFY WEBPAGE CONTENT ---------
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

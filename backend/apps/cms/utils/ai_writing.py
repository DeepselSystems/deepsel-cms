import logging

import httpx
from fastapi import HTTPException


logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a professional content writer. Generate high-quality page content based on the user's request.

IMPORTANT: Format your output as clean HTML using ONLY these allowed tags:
- <h1>, <h2>, <h3>, <h4> for headings
- <ul> and <li> for unordered lists
- <ol> and <li> for ordered lists  
- <strong> for bold text
- <p> for paragraphs

Rules:
1. Write engaging, well-structured content
2. Use appropriate HTML headings (h1-h4) and formatting
3. Make the content informative and valuable to readers
4. Keep a professional but friendly tone
5. Return ONLY the HTML content, no additional explanations or meta-text
6. Do not use any HTML tags other than the ones listed above
7. Ensure all HTML tags are properly closed

Example format:
<p>Introduction paragraph with <strong>important points</strong>.</p>
<h2>Section Title</h2>
<ul>
<li>First point</li>
<li>Second point</li>
</ul>"""


async def generate_page_content(
    prompt: str,
    model_string_id: str,
    openrouter_api_key: str,
) -> str:
    """Call OpenRouter to generate page content HTML."""
    user_prompt = f"Create page content: {prompt}"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://deepsel.com",
                    "X-Title": "DeepSel CMS",
                },
                json={
                    "model": model_string_id,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 5000,
                },
            )
            response.raise_for_status()

            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                return result["choices"][0]["message"]["content"].strip()

            logger.error("Unexpected AI API response format: %s", result)
            raise HTTPException(
                status_code=500, detail="Unexpected response from AI API"
            )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504, detail="AI API request timed out. Please try again."
        )
    except httpx.HTTPStatusError as exc:
        logger.error(
            "AI API request failed: %s - %s",
            exc.response.status_code if exc.response else "unknown",
            exc.response.text if exc.response else "no response text",
        )
        raise HTTPException(
            status_code=500,
            detail=f"AI API request failed: {exc.response.status_code if exc.response else 'unknown'}",
        )
    except httpx.RequestError as exc:
        logger.error("AI API request error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to connect to AI API")
    except Exception as exc:
        logger.error("AI writing error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while generating content",
        )

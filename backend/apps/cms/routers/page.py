import requests
import logging
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, Body, Path, Query, Request, status
from db import get_db
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user, get_current_user_optional
from deepsel.utils.models_pool import models_pool
from apps.cms.utils.search import search_pages_and_posts, SearchResponse
from apps.cms.utils.get_page_content import get_page_content
from apps.cms.types.page import PageContentResponse
from apps.cms.utils.translate_page_content import translate_page_content


logger = logging.getLogger(__name__)

table_name = "page"
CRUDSchemas = generate_CRUD_schemas(table_name)


router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)


class TranslationRequest(BaseModel):
    content: dict[str, Any]
    sourceLocale: str
    targetLocale: str


@router.post("/translate")
async def translate_content(
    request: TranslationRequest = Body(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Translate page content from source locale to target locale"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )

    # Get organization settings
    org_id = user.organization_id
    OrganizationModel = models_pool["organization"]
    org_settings = db.query(OrganizationModel).get(org_id)

    return await translate_page_content(
        content=request.content,
        source_locale=request.sourceLocale,
        target_locale=request.targetLocale,
        org_settings=org_settings,
    )


@router.get("/website/{lang}/{slug}", response_model=PageContentResponse)
def get_page_by_lang_and_slug(
    request: Request,
    lang: str = Path(..., description="Language ISO code"),
    slug: str = Path(..., description="Page slug"),
    preview: bool = Query(
        False, description="Enable preview mode to show unpublished pages"
    ),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
) -> PageContentResponse:
    """Get page content by language and slug"""

    return get_page_content(request, lang, slug, preview, db, current_user)


class AIWritingRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_id: int
    prompt: str


@router.post("/ai_writing")
def ai_writing(
    request: AIWritingRequest = Body(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Use AI API to generate content based on user prompt"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Get organization settings
    org_id = user.organization_id
    OrganizationModel = models_pool["organization"]
    org_settings = db.query(OrganizationModel).get(org_id)

    if not org_settings:
        raise HTTPException(status_code=400, detail="Organization settings not found")

    openrouter_api_key = org_settings.openrouter_api_key

    # If no API keys, return error
    if not openrouter_api_key:
        raise HTTPException(
            status_code=400,
            detail="No AI API keys configured. Please configure OpenRouter API key in site settings.",
        )

    openrouter_model = db.query(models_pool["openrouter_model"]).get(request.model_id)

    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    try:
        # Prepare the content generation prompt
        system_prompt = """You are a professional content writer. Generate high-quality page content based on the user's request.

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

        user_prompt = f"Create page content: {request.prompt}"

        # Determine which API to use (prioritize OpenRouter over OpenAI)
        if openrouter_api_key:
            # Call OpenRouter API
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://deepsel.com",  # Required by OpenRouter
                    "X-Title": "Deepsel CMS",  # Required by OpenRouter
                },
                json={
                    "model": openrouter_model.string_id,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 5000,
                },
                timeout=60.0,
            )

        else:
            # This shouldn't happen as we checked above, but just in case
            raise HTTPException(status_code=400, detail="No API keys available")

        # Check if the request was successful
        if response.status_code != 200:
            logger.error(
                f"AI API request failed: {response.status_code} - {response.text}"
            )
            raise HTTPException(
                status_code=500, detail=f"AI API request failed: {response.status_code}"
            )

        result = response.json()

        # Extract the generated content
        if "choices" in result and len(result["choices"]) > 0:
            generated_content = result["choices"][0]["message"]["content"].strip()

            return {
                "content": generated_content,
                "model": openrouter_model,
                "prompt": request.prompt,
            }
        else:
            logger.error(f"Unexpected AI API response format: {result}")
            raise HTTPException(
                status_code=500, detail="Unexpected response from AI API"
            )

    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504, detail="AI API request timed out. Please try again."
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"AI API request error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to connect to AI API")
    except Exception as e:
        logger.error(f"AI writing error: {str(e)}")
        raise HTTPException(
            status_code=500, detail="An error occurred while generating content"
        )


@router.get("/website_search/{lang}", response_model=SearchResponse)
async def website_search(
    request: Request,
    lang: str = Path(..., description="Language ISO code"),
    q: str = Query(..., description="Search query"),
    limit: int = Query(100, description="Maximum number of results", le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
) -> SearchResponse:
    """Search through published pages and blog posts for a given language"""
    return await search_pages_and_posts(request, lang, q, limit, db, current_user)

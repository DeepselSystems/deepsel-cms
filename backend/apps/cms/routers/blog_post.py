from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user
from pydantic import BaseModel
import requests
import logging
from fastapi import Depends, HTTPException, Body
from sqlalchemy.orm import Session
from db import get_db
from apps.cms.models.organization import CMSSettingsModel
from apps.cms.utils.get_blog_list import get_blog_list, BlogListResponse
from apps.cms.utils.get_blog_post import get_blog_post, BlogPostResponse

logger = logging.getLogger(__name__)

table_name = "blog_post"
CRUDSchemas = generate_CRUD_schemas(table_name)
CRUDUserSchemas = generate_CRUD_schemas("user")

router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)


class TranslationRequest(BaseModel):
    content: Dict[str, Any]
    sourceLocale: str
    targetLocale: str


@router.post("/translate")
async def translate_content(
    request: TranslationRequest = Body(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Translate blog post content from source locale to target locale"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Get organization settings
    org_id = user.organization_id
    org_settings = db.query(CMSSettingsModel).get(org_id)

    # Check if auto-translate for blog posts is enabled
    if not org_settings or not org_settings.auto_translate_posts:
        return request.content

    # Check for API keys in organization settings
    openrouter_api_key = org_settings.openrouter_api_key
    openai_api_key = org_settings.openai_api_key

    # If no API keys or empty content, just return the original content
    if not (openrouter_api_key or openai_api_key) or not request.content:
        return request.content

    try:
        # Prepare the content for translation
        # Convert nested dictionaries to a flat structure for translation
        flat_content = {}

        def flatten_dict(d, parent_key=""):
            for k, v in d.items():
                key = f"{parent_key}.{k}" if parent_key else k
                if isinstance(v, dict):
                    flatten_dict(v, key)
                else:
                    if isinstance(v, str) and v.strip():
                        flat_content[key] = v

        flatten_dict(request.content)

        # If no text content to translate, return original
        if not flat_content:
            return request.content

        # Prepare the translation prompt
        keys = list(flat_content.keys())
        values = list(flat_content.values())

        prompt = f"Translate the following texts from {request.sourceLocale} to {request.targetLocale}. Return only the translations in the same order, one per line:\n\n"
        for value in values:
            prompt += f"{value}\n"

        # Determine which API to use (prioritize OpenRouter over OpenAI)
        if openrouter_api_key:
            # Call OpenRouter API
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://deepsel.com",  # Required by OpenRouter
                    "X-Title": "DeepSel CMS",  # Required by OpenRouter
                },
                json={
                    "model": "google/gemini-flash-1.5-8b",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a translation assistant. Translate the text exactly as provided without adding any explanations or additional text.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                },
                timeout=30.0,
            )
        elif openai_api_key:
            # Call OpenAI API
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a translation assistant. Translate the text exactly as provided without adding any explanations or additional text.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                },
                timeout=30.0,
            )
        else:
            # No API keys available, return original content
            return request.content

        result = response.json()

        if "choices" in result and len(result["choices"]) > 0:
            translations = (
                result["choices"][0]["message"]["content"].strip().split("\n")
            )

            # Make sure we have the same number of translations as source texts
            if len(translations) == len(values):
                # Create a dictionary of translated content
                translated_flat = {keys[i]: translations[i] for i in range(len(keys))}

                # Convert back to nested structure
                result_dict = {}

                for key, value in translated_flat.items():
                    parts = key.split(".")
                    d = result_dict
                    for i, part in enumerate(parts):
                        if i == len(parts) - 1:
                            d[part] = value
                        else:
                            if part not in d:
                                d[part] = {}
                            d = d[part]

                return result_dict

        # If translation failed, return the original content
        return request.content

    except Exception as e:
        print(f"Translation error: {str(e)}")
        # In case of any error, return the original content
        return request.content


# /blog_post/website/lang
@router.get("/website/{lang}", response_model=BlogListResponse)
def get_website_blog_list(lang: str, db: Session = Depends(get_db)):
    return get_blog_list(
        target_lang=lang,
        org_settings=None,
        db=db,
        current_user=None,
    )


# /blog_post/website/lang/slug
@router.get("/website/{lang}/{slug}", response_model=BlogPostResponse)
def get_website_blog_post(lang: str, slug: str, db: Session = Depends(get_db)):
    return get_blog_post(
        target_lang=lang,
        slug=slug,
        org_settings=None,
        db=db,
        current_user=None,
    )

from typing import Any, Optional
from fastapi import Body, Depends, HTTPException, Path, Query, Request, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from apps.cms.utils.ai_writing import generate_page_content
from apps.cms.utils.get_page_content import get_page_content, PageContentResponse
from apps.cms.utils.search import SearchResponse, search_pages_and_posts
from apps.cms.utils.translate_page_content import translate_page_content
from db import get_db
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user, get_current_user_optional
from deepsel.utils.models_pool import models_pool

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
async def ai_writing(
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

    generated_content = await generate_page_content(
        prompt=request.prompt,
        model_string_id=openrouter_model.string_id,
        openrouter_api_key=openrouter_api_key,
    )

    return {
        "content": generated_content,
        "model": openrouter_model,
        "prompt": request.prompt,
    }


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

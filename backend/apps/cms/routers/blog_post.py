from typing import Any

from fastapi import Body, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from apps.cms.models.organization import CMSSettingsModel
from apps.cms.utils.get_blog_list import BlogListResponse, get_blog_list
from apps.cms.utils.get_blog_post import BlogPostResponse, get_blog_post
from apps.cms.utils.translate_blog_content import translate_blog_content
from db import get_db
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user


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
    content: dict[str, Any]
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

    org_id = user.organization_id
    org_settings = db.query(CMSSettingsModel).get(org_id)

    return await translate_blog_content(
        content=request.content,
        source_locale=request.sourceLocale,
        target_locale=request.targetLocale,
        org_settings=org_settings,
    )


# /blog_post/website/lang
@router.get("/website/{lang}", response_model=BlogListResponse)
def get_website_blog_list(request: Request, lang: str, db: Session = Depends(get_db)):
    return get_blog_list(
        request=request,
        target_lang=lang,
        db=db,
        current_user=None,
    )


# /blog_post/website/lang/slug
@router.get("/website/{lang}/{slug}", response_model=BlogPostResponse)
def get_website_blog_post(
    request: Request, lang: str, slug: str, db: Session = Depends(get_db)
):
    return get_blog_post(
        request=request,
        target_lang=lang,
        slug=slug,
        db=db,
        current_user=None,
    )

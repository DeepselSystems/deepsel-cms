import copy
import requests
import logging
from typing import Any, Optional, List
from apps.cms.utils.shared_datatypes import SEOMetadata
from pydantic import BaseModel, ConfigDict
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user, get_current_user_optional
from fastapi import Depends, HTTPException, Body, Path, Query, Request, status
from sqlalchemy.orm import Session
from db import get_db
from apps.cms.models.organization import CMSSettingsModel
from apps.cms.utils.domain_detection import detect_domain_from_request
from apps.cms.utils.render_wysiwyg_content import render_wysiwyg_content
from apps.cms.utils.get_blog_list import get_blog_list
from apps.cms.utils.get_blog_post import get_blog_post
from apps.cms.utils.search import search_pages_and_posts, SearchResponse
from deepsel.utils.models_pool import models_pool

logger = logging.getLogger(__name__)

table_name = "page"
CRUDSchemas = generate_CRUD_schemas(table_name)


class AuthorSchema(BaseModel):
    """Simple author schema for blog posts"""

    id: int
    display_name: Optional[str] = None
    username: str
    image: Optional[str] = None  # Image filename


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
def translate_content(
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

    # Check if auto-translate for pages is enabled
    if not org_settings:
        return request.content

    if not org_settings.auto_translate_pages:
        return request.content

    # Check for API keys in organization settings
    openrouter_api_key = org_settings.openrouter_api_key

    # If no API keys or empty content, just return the original content
    if not openrouter_api_key:
        return request.content

    if not request.content:
        return request.content

    # Check if AI translation model is configured
    if org_settings.ai_translation_model:
        openrouter_model = org_settings.ai_translation_model.string_id
    else:
        openrouter_model = "google/gemini-flash-1.5-8b"

    try:
        # Create result with original content structure
        result_dict = copy.deepcopy(request.content)
        translations_made = 0

        # Helper function to make translation request
        def translate_single_text(text, content_type="text"):
            if content_type == "html":
                system_prompt = """You are a professional translator. Translate the HTML content while preserving all HTML tags, attributes, and structure.

IMPORTANT RULES:
- Return ONLY the translated HTML content
- Do NOT wrap the output in code blocks (no ```html or ```)
- Do NOT add any explanations, prefixes, or suffixes
- The output must be ready-to-render HTML
- Preserve all HTML formatting, tags, and structure exactly"""
                user_prompt = f"Translate this HTML content from {request.sourceLocale} to {request.targetLocale}:\n\n{text}"
            else:
                system_prompt = "You are a professional translator. Return ONLY the translated text, no explanations or additional content."
                user_prompt = f"Translate from {request.sourceLocale} to {request.targetLocale}: {text}"

            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://deepsel.com",
                    "X-Title": "DeepSel CMS",
                },
                json={
                    "model": openrouter_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.1,
                },
                timeout=30.0,
            )

            if response.status_code == 200:
                result = response.json()
                if "choices" in result and result["choices"]:
                    content = result["choices"][0]["message"]["content"].strip()

                    # Clean up response if it contains code blocks
                    if content_type == "html":
                        # Remove ```html and ``` wrapping if present
                        if content.startswith("```html"):
                            content = content[7:]  # Remove ```html
                        elif content.startswith("```"):
                            content = content[3:]  # Remove ```

                        if content.endswith("```"):
                            content = content[:-3]  # Remove trailing ```

                        content = content.strip()

                    return content

            logger.error(
                f"Translation failed for {content_type}: {response.status_code}"
            )
            return None

        # Translate title if present
        if (
            "title" in request.content
            and isinstance(request.content["title"], str)
            and request.content["title"].strip()
        ):
            logger.info("Translating title...")
            translated_title = translate_single_text(request.content["title"], "text")
            if translated_title:
                result_dict["title"] = translated_title
                translations_made += 1
                logger.info("Title translated successfully")
            else:
                logger.warning("Title translation failed, keeping original")

        # Translate ds-value from content.main if present
        if (
            "content" in request.content
            and isinstance(request.content["content"], dict)
            and "main" in request.content["content"]
            and isinstance(request.content["content"]["main"], dict)
            and "ds-value" in request.content["content"]["main"]
            and isinstance(request.content["content"]["main"]["ds-value"], str)
            and request.content["content"]["main"]["ds-value"].strip()
        ):

            logger.info("Translating HTML content...")
            html_content = request.content["content"]["main"]["ds-value"]
            translated_html = translate_single_text(html_content, "html")
            if translated_html:
                result_dict["content"]["main"]["ds-value"] = translated_html
                translations_made += 1
                logger.info("HTML content translated successfully")
            else:
                logger.warning("HTML content translation failed, keeping original")

        if translations_made == 0:
            logger.info("No translatable content found or all translations failed")
        else:
            logger.info(
                f"Translation completed successfully. {translations_made} field(s) translated"
            )

        return result_dict

    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        # In case of any error, return the original content
        return request.content


class PageContentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: Any = None
    lang: str = None
    public_settings: dict[str, Any]
    seo_metadata: Optional[SEOMetadata] = None  # SEO metadata for the page
    language_alternatives: Optional[List[dict]] = (
        None  # Available language versions with slugs
    )
    # Additional fields for frontend pages
    is_frontend_page: Optional[bool] = None
    string_id: Optional[str] = None
    contents: Optional[List[dict]] = None
    # Custom code fields
    page_custom_code: Optional[str] = None
    custom_code: Optional[str] = None
    # Access control
    require_login: Optional[bool] = None
    # Blog-related fields
    blog_posts: Optional[List[dict]] = None  # For blog list pages
    featured_image_id: Optional[int] = None  # For single blog posts
    publish_date: Optional[str] = None  # For single blog posts
    author: Optional[dict] = None  # For single blog posts


@router.get("/website/{lang}/{slug}", response_model=PageContentResponse)
async def get_page_by_lang_and_slug(
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

    # Add a leading slash to the slug if it doesn't have one
    if slug == "default":
        slug = "/"
    if not slug.startswith("/"):
        slug = f"/{slug}"

    LocaleModel = models_pool["locale"]

    # Detect organization by domain
    domain = detect_domain_from_request(request)
    org_settings = CMSSettingsModel.find_organization_by_domain(domain, db)

    if not org_settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    # Determine default language
    default_lang = org_settings.default_language.iso_code if org_settings else None
    target_lang = lang if lang != "default" else default_lang

    # Detect if this is a blog route (starts with /blog)
    is_blog_route = slug.startswith("/blog")

    if is_blog_route:
        # Extract the post slug by removing /blog prefix
        post_slug = slug[5:]  # Remove "/blog" prefix

        # Determine if this is a blog list or single post
        is_blog_list = not post_slug or post_slug == "/"

        if is_blog_list:
            # Handle blog list
            blog_posts, settings, returned_lang = get_blog_list(
                target_lang=target_lang,
                org_settings=org_settings,
                db=db,
                current_user=current_user,
            )

            # Return blog list response
            return PageContentResponse(
                id=0,  # No page ID for blog list
                title="Blog",
                content=None,
                lang=returned_lang,
                public_settings=settings,
                blog_posts=blog_posts,
            )
        else:
            # Handle single blog post
            blog_post_data = get_blog_post(
                target_lang=target_lang,
                post_slug=post_slug,
                org_settings=org_settings,
                db=db,
                current_user=current_user,
            )

            # Return single blog post response
            return PageContentResponse(**blog_post_data)

    # Find content by language-specific slug
    # Find the locale ID for the requested language
    locale = None
    if lang == "default":
        default_lang = org_settings.default_language.iso_code if org_settings else None
        locale = (
            db.query(LocaleModel).filter(LocaleModel.iso_code == default_lang).first()
        )
    else:
        locale = db.query(LocaleModel).filter(LocaleModel.iso_code == lang).first()

    if locale:
        PageModel = models_pool["page"]
        PageContentModel = models_pool["page_content"]

        # Build query filters
        query_filters = [
            PageContentModel.slug == slug,
            PageContentModel.locale_id == locale.id,
            PageModel.organization_id == org_settings.id,
        ]

        # Only filter by published status if not in preview mode or not authenticated
        if not preview or not current_user:
            query_filters.append(PageModel.published == True)

        # Try to find content with matching language-specific slug
        matching_content = (
            db.query(PageContentModel)
            .join(PageModel, PageContentModel.page_id == PageModel.id)
            .filter(*query_filters)
            .first()
        )

        # If no content found for requested language, try default language
        if not matching_content and lang != "default" and org_settings.default_language:
            # Build query filters for default language
            default_query_filters = [
                PageContentModel.slug == slug,
                PageContentModel.locale_id == org_settings.default_language.id,
                PageModel.organization_id == org_settings.id,
            ]

            # Only filter by published status if not in preview mode or not authenticated
            if not preview or not current_user:
                default_query_filters.append(PageModel.published == True)

            matching_content = (
                db.query(PageContentModel)
                .join(PageModel, PageContentModel.page_id == PageModel.id)
                .filter(*default_query_filters)
                .first()
            )

        if matching_content:
            page = matching_content.page

            # Check if login is required for this page
            if page.require_login and not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required",
                )

            # Get public settings (menus are always included)
            settings = org_settings.get_public_settings(
                org_settings.id,  # Use detected organization
                db,
                lang=lang if lang != "default" else default_lang,
            )

            # Render wysiwyg content with Jinja2
            rendered_content = render_wysiwyg_content(
                matching_content,
                org_settings.id,
                db,
                (
                    org_settings.default_language.id
                    if org_settings.default_language
                    else None
                ),
                current_user,
            )

            # Prepare response data
            response_data = {
                "id": page.id,
                "title": matching_content.title,
                "content": rendered_content,
                "lang": lang if lang != "default" else default_lang,
                "public_settings": settings,
                "seo_metadata": {
                    "title": matching_content.seo_metadata_title
                    or matching_content.title,
                    "description": matching_content.seo_metadata_description,
                    "featured_image_id": matching_content.seo_metadata_featured_image_id,
                    "featured_image_name": (
                        matching_content.seo_metadata_featured_image.name
                        if matching_content.seo_metadata_featured_image
                        else None
                    ),
                    "allow_indexing": matching_content.seo_metadata_allow_indexing,
                },
                "custom_code": matching_content.custom_code,
                "require_login": page.require_login,
                "language_alternatives": [
                    {
                        "slug": content.slug,
                        "locale": {
                            "id": content.locale.id,
                            "name": content.locale.name,
                            "iso_code": content.locale.iso_code,
                        },
                    }
                    for content in page.contents
                ],
            }

            return response_data

    # No matching content found with the specified slug
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")


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
                    "X-Title": "DeepSel CMS",  # Required by OpenRouter
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

import logging
import re
from typing import List, Optional

from pydantic import BaseModel
from fastapi import HTTPException, Request, Query, Path, Depends
from sqlalchemy import func, literal, text as sa_text, union_all, select
from sqlalchemy.orm import Session

from db import get_db
from apps.cms.models.organization import CMSSettingsModel
from apps.cms.utils.domain_detection import detect_domain_from_request
from apps.core.utils.get_current_user import get_current_user_optional
from apps.core.utils.models_pool import models_pool
from settings import DEFAULT_ORG_ID

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Plain-text extraction helpers
# ---------------------------------------------------------------------------


def strip_html_tags(html: str) -> str:
    """Remove HTML tags and collapse whitespace to plain text."""
    if not html:
        return ""
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()


def extract_page_plain_text(content_json) -> str:
    """Extract plain text from TipTap JSON (``content["main"]["ds-value"]``)."""
    if not content_json:
        return ""
    try:
        html = content_json.get("main", {}).get("ds-value", "")
    except AttributeError:
        return ""
    return strip_html_tags(html)


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class SearchResultItem(BaseModel):
    """Single search result item"""

    id: str
    title: str
    url: str
    publishDate: Optional[str] = None
    contentType: str  # "Blog" or "Page"
    relevanceScore: float


class SearchResponse(BaseModel):
    """Search response containing pages and blog posts"""

    results: List[SearchResultItem]
    total: int
    suggestions: List[str] = []


# ---------------------------------------------------------------------------
# Main search endpoint
# ---------------------------------------------------------------------------


async def search_pages_and_posts(
    request: Request,
    lang: str = Path(..., description="Language ISO code"),
    q: str = Query(..., description="Search query"),
    limit: int = Query(100, description="Maximum number of results", le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
) -> SearchResponse:
    """Search through published pages and blog posts using PostgreSQL FTS."""
    if not q or not q.strip():
        return SearchResponse(results=[], total=0)

    # --- Org detection (unchanged) ---
    domain = detect_domain_from_request(request)
    OrganizationModel = models_pool["organization"]
    org_settings = CMSSettingsModel.find_organization_by_domain(domain, db)

    if not org_settings:
        org_settings = (
            db.query(OrganizationModel)
            .filter(OrganizationModel.id == DEFAULT_ORG_ID)
            .first()
        )
    if not org_settings:
        raise HTTPException(status_code=404, detail="No organization available")

    org_id = org_settings.id

    default_lang = (
        org_settings.default_language.iso_code
        if org_settings.default_language
        else None
    )
    if not default_lang:
        default_lang = lang

    # --- Models ---
    LocaleModel = models_pool["locale"]
    PageModel = models_pool["page"]
    PageContentModel = models_pool["page_content"]
    BlogPostModel = models_pool["blog_post"]
    BlogPostContentModel = models_pool["blog_post_content"]

    # --- Build tsquery ---
    search_query = func.plainto_tsquery("simple", q.strip())

    # --- Page results ---
    results: List[SearchResultItem] = []

    try:
        page_q = (
            db.query(
                PageContentModel.id,
                PageContentModel.title,
                PageContentModel.slug,
                PageModel.updated_at,
                PageModel.id.label("page_id"),
                LocaleModel.iso_code,
                func.ts_rank(PageContentModel.search_vector, search_query).label(
                    "rank"
                ),
            )
            .join(PageModel, PageModel.id == PageContentModel.page_id)
            .join(LocaleModel, LocaleModel.id == PageContentModel.locale_id)
            .filter(
                PageModel.organization_id == org_id,
                PageModel.published.is_(True),
                LocaleModel.iso_code == lang,
                PageContentModel.search_vector.op("@@")(search_query),
            )
        )
        if not current_user:
            page_q = page_q.filter(PageModel.require_login.is_(False))

        page_q = page_q.order_by(sa_text("rank DESC")).limit(limit)

        for row in page_q.all():
            url = row.slug
            if row.iso_code != default_lang:
                url = f"/{row.iso_code}{row.slug}"
            results.append(
                SearchResultItem(
                    id=f"page-{row.page_id}-{row.iso_code}",
                    title=row.title,
                    url=url,
                    publishDate=(
                        row.updated_at.isoformat() if row.updated_at else None
                    ),
                    contentType="Page",
                    relevanceScore=float(row.rank),
                )
            )
    except Exception as e:
        logger.error(f"Error searching pages: {e}")

    # --- Blog post results ---
    try:
        blog_q = (
            db.query(
                BlogPostContentModel.id,
                BlogPostContentModel.title,
                BlogPostModel.slug,
                BlogPostModel.publish_date,
                BlogPostModel.id.label("post_id"),
                LocaleModel.iso_code,
                func.ts_rank(BlogPostContentModel.search_vector, search_query).label(
                    "rank"
                ),
            )
            .join(
                BlogPostModel,
                BlogPostModel.id == BlogPostContentModel.post_id,
            )
            .join(LocaleModel, LocaleModel.id == BlogPostContentModel.locale_id)
            .filter(
                BlogPostModel.organization_id == org_id,
                BlogPostModel.published.is_(True),
                LocaleModel.iso_code == lang,
                BlogPostContentModel.search_vector.op("@@")(search_query),
            )
        )
        if not current_user:
            blog_q = blog_q.filter(BlogPostModel.require_login.is_(False))

        blog_q = blog_q.order_by(sa_text("rank DESC")).limit(limit)

        for row in blog_q.all():
            url = f"/blog{row.slug}"
            if row.iso_code != default_lang:
                url = f"/{row.iso_code}/blog{row.slug}"
            results.append(
                SearchResultItem(
                    id=f"blog-{row.post_id}-{row.iso_code}",
                    title=row.title,
                    url=url,
                    publishDate=(
                        row.publish_date.isoformat() if row.publish_date else None
                    ),
                    contentType="Blog",
                    relevanceScore=float(row.rank),
                )
            )
    except Exception as e:
        logger.error(f"Error searching blog posts: {e}")

    # --- Sort combined results by relevance ---
    results.sort(key=lambda r: r.relevanceScore, reverse=True)
    results = results[:limit]

    # --- Suggestions via pg_trgm when no results ---
    suggestions: List[str] = []
    if not results and q.strip():
        try:
            rows = db.execute(
                sa_text("""
                    SELECT DISTINCT word
                    FROM (
                        SELECT unnest(string_to_array(lower(pc.title), ' ')) AS word
                        FROM page_content pc
                        JOIN page p ON p.id = pc.page_id
                        JOIN locale l ON l.id = pc.locale_id
                        WHERE p.organization_id = :org_id
                          AND p.published = true
                          AND l.iso_code = :lang
                        UNION
                        SELECT unnest(string_to_array(lower(bpc.title), ' ')) AS word
                        FROM blog_post_content bpc
                        JOIN blog_post bp ON bp.id = bpc.post_id
                        JOIN locale l ON l.id = bpc.locale_id
                        WHERE bp.organization_id = :org_id
                          AND bp.published = true
                          AND l.iso_code = :lang
                    ) words
                    WHERE length(word) > 2
                      AND similarity(word, :query) > 0.3
                    ORDER BY similarity(word, :query) DESC
                    LIMIT 3
                """),
                {"org_id": org_id, "lang": lang, "query": q.lower().strip()},
            )
            suggestions = [row[0] for row in rows]
        except Exception as e:
            logger.warning(f"Could not generate search suggestions: {e}")

    return SearchResponse(results=results, total=len(results), suggestions=suggestions)

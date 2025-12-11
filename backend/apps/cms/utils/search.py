import logging
import re
import unicodedata
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
from fastapi import HTTPException, Request, Query, Path, Depends
from sqlalchemy.orm import Session
from db import get_db
from apps.cms.models.organization import CMSSettingsModel
from apps.cms.utils.domain_detection import detect_domain_from_request
from deepsel.utils.get_current_user import get_current_user_optional
from deepsel.utils.models_pool import models_pool
from constants import DEFAULT_ORG_ID

logger = logging.getLogger(__name__)


def normalize_text_for_search(text):
    """
    Normalize text for search by:
    - Converting to lowercase
    - Normalizing Unicode characters (removing accents, etc.)
    - Removing extra whitespace
    """
    if not text:
        return ""

    # Convert to lowercase
    text = text.lower()

    # Normalize Unicode - decompose characters and remove accents
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")

    # Remove extra whitespace and normalize
    text = re.sub(r"\s+", " ", text.strip())

    return text


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


def calculate_levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate the Levenshtein distance between two strings"""
    if len(s1) < len(s2):
        return calculate_levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def generate_search_suggestions(
    search_query: str, all_content_words: List[str], max_suggestions: int = 3
) -> List[str]:
    """Generate search suggestions based on similar words from content"""
    if not search_query or not all_content_words:
        return []

    search_query_lower = search_query.lower().strip()
    suggestions = []

    # Dictionary to store word similarities
    word_similarities = {}

    for word in all_content_words:
        word_lower = word.lower().strip()

        # Skip if same word or too short
        if word_lower == search_query_lower or len(word_lower) < 3:
            continue

        # Calculate similarity based on Levenshtein distance
        distance = calculate_levenshtein_distance(search_query_lower, word_lower)
        max_len = max(len(search_query_lower), len(word_lower))

        # Only consider words within reasonable edit distance
        # For typos, we want distance <= 2 for reasonable suggestions
        if distance <= 2 and distance < max_len * 0.5:
            similarity_score = 1 - (distance / max_len)
            word_similarities[word_lower] = similarity_score

    # Sort by similarity score and get top suggestions
    sorted_suggestions = sorted(
        word_similarities.items(), key=lambda x: x[1], reverse=True
    )
    suggestions = [word for word, score in sorted_suggestions[:max_suggestions]]

    return suggestions


async def search_pages_and_posts(
    request: Request,
    lang: str = Path(..., description="Language ISO code"),
    q: str = Query(..., description="Search query"),
    limit: int = Query(100, description="Maximum number of results", le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
) -> SearchResponse:
    """Search through published pages and blog posts for a given language"""
    if not q or not q.strip():
        return SearchResponse(results=[], total=0)

    # Normalize search query for better matching
    search_query = normalize_text_for_search(q)
    results = []
    all_content_words = set()  # Collect words for suggestions

    # Detect organization by domain
    domain = detect_domain_from_request(request)
    OrganizationModel = models_pool["organization"]
    org_settings = CMSSettingsModel.find_organization_by_domain(domain, db)

    # Fallback to default organization if domain-based detection fails
    if not org_settings:
        org_settings = (
            db.query(OrganizationModel)
            .filter(OrganizationModel.id == DEFAULT_ORG_ID)
            .first()
        )

    if not org_settings:
        raise HTTPException(status_code=404, detail="No organization available")

    LocaleModel = models_pool["locale"]
    PageModel = models_pool["page"]
    PageContentModel = models_pool["page_content"]
    BlogPostModel = models_pool["blog_post"]

    # Get default language for URL construction (only use if organization has one set)
    default_lang = (
        org_settings.default_language.iso_code
        if org_settings.default_language
        else None
    )

    # If no default language is set and we need one for URL construction, use the requested language
    if not default_lang:
        default_lang = lang

    # Search in pages - fetch all published pages and manually match
    try:
        page_results = (
            db.query(PageModel, PageContentModel, LocaleModel)
            .join(PageContentModel, PageModel.id == PageContentModel.page_id)
            .join(LocaleModel, PageContentModel.locale_id == LocaleModel.id)
            .filter(
                PageModel.organization_id == org_settings.id,
                PageModel.published == True,
            )
            .all()
        )

        for page, content, locale in page_results:
            # Filter by exact language match
            if locale.iso_code != lang:
                continue  # Skip if not the requested language

            # Skip pages that require login if user is not authenticated
            if page.require_login and not current_user:
                continue

            # Manual matching with Unicode normalization
            title_normalized = normalize_text_for_search(content.title)
            content_normalized = normalize_text_for_search(
                str(content.content) if content.content else ""
            )

            # Collect words for suggestions (split by spaces and common separators)
            title_words = (
                re.findall(r"\w+", content.title.lower()) if content.title else []
            )
            content_words = (
                re.findall(r"\w+", str(content.content).lower())
                if content.content
                else []
            )
            all_content_words.update(title_words + content_words)

            # Check if normalized search query matches normalized title or content
            title_match = search_query in title_normalized
            content_match = search_query in content_normalized

            if not title_match and not content_match:
                continue  # Skip if no match found

            # Calculate relevance score based on title and content matches
            relevance_score = 1.0

            # Title matches get higher score (more important)
            if title_match:
                relevance_score += 2.0
                # Exact title match gets even higher score
                if search_query == title_normalized:
                    relevance_score += 1.0

            # Content matches get moderate score
            if content_match:
                relevance_score += 1.0
                # Count multiple occurrences in content (up to 3x bonus)
                content_matches = content_normalized.count(search_query)
                relevance_score += min(content_matches * 0.2, 0.6)

            # Boost score if search term appears in both title and content
            if title_match and content_match:
                relevance_score += 0.5

            # Boost score if content is in requested language
            if locale.iso_code == lang:
                relevance_score += 1.0

            # Construct URL based on language
            url = content.slug
            if locale.iso_code != default_lang:
                url = f"/{locale.iso_code}{content.slug}"

            results.append(
                SearchResultItem(
                    id=f"page-{page.id}-{locale.iso_code}",
                    title=content.title,
                    url=url,
                    publishDate=(
                        page.updated_at.isoformat() if page.updated_at else None
                    ),
                    contentType="Page",
                    relevanceScore=relevance_score,
                )
            )

            # Stop if we have enough results
            if len(results) >= limit:
                break

    except Exception as e:
        logger.error(f"Error searching pages: {str(e)}")

    # Search in blog posts through their contents - fetch all and manually match
    try:
        BlogPostContentModel = models_pool["blog_post_content"]

        blog_results = (
            db.query(BlogPostModel, BlogPostContentModel, LocaleModel)
            .join(
                BlogPostContentModel, BlogPostModel.id == BlogPostContentModel.post_id
            )
            .join(LocaleModel, BlogPostContentModel.locale_id == LocaleModel.id)
            .filter(
                BlogPostModel.organization_id == org_settings.id,
                BlogPostModel.published == True,
            )
            .all()
        )

        for post, content, locale in blog_results:
            # Filter by exact language match
            if locale.iso_code != lang:
                continue  # Skip if not the requested language

            # Skip blog posts that require login if user is not authenticated
            if post.require_login and not current_user:
                continue

            # Manual matching with Unicode normalization
            title_normalized = normalize_text_for_search(content.title)
            content_normalized = normalize_text_for_search(
                str(content.content) if content.content else ""
            )

            # Collect words for suggestions (split by spaces and common separators)
            title_words = (
                re.findall(r"\w+", content.title.lower()) if content.title else []
            )
            content_words = (
                re.findall(r"\w+", str(content.content).lower())
                if content.content
                else []
            )
            all_content_words.update(title_words + content_words)

            # Check if normalized search query matches normalized title or content
            title_match = search_query in title_normalized
            content_match = search_query in content_normalized

            if not title_match and not content_match:
                continue  # Skip if no match found

            # Calculate relevance score based on title and content matches
            relevance_score = 1.0

            # Title matches get higher score (more important)
            if title_match:
                relevance_score += 2.0
                # Exact title match gets even higher score
                if search_query == title_normalized:
                    relevance_score += 1.0

            # Content matches get moderate score
            if content_match:
                relevance_score += 1.0
                # Count multiple occurrences in content (up to 3x bonus)
                content_matches = content_normalized.count(search_query)
                relevance_score += min(content_matches * 0.2, 0.6)

            # Boost score if search term appears in both title and content
            if title_match and content_match:
                relevance_score += 0.5

            # Boost score if content is in requested language
            if locale.iso_code == lang:
                relevance_score += 1.0

            # Blog posts get slight boost for recency (newer posts rank higher)
            if post.publish_date:

                try:
                    # Make sure both datetimes are timezone-aware for comparison
                    now = datetime.now(timezone.utc)
                    publish_date = post.publish_date

                    # If publish_date is naive, assume it's UTC
                    if publish_date.tzinfo is None:
                        publish_date = publish_date.replace(tzinfo=timezone.utc)

                    days_old = (now - publish_date).days
                    if days_old < 30:  # Posts less than 30 days old get boost
                        relevance_score += 0.3
                    elif days_old < 90:  # Posts less than 90 days old get smaller boost
                        relevance_score += 0.1
                except Exception as e:
                    logger.warning(
                        f"Error calculating recency for blog post {post.id}: {e}"
                    )
                    # Continue without recency bonus

            # Construct URL based on language - slug already includes /blog prefix
            url = f"/blog{post.slug}"
            if locale.iso_code != default_lang:
                url = f"/{locale.iso_code}/blog{post.slug}"

            results.append(
                SearchResultItem(
                    id=f"blog-{post.id}-{locale.iso_code}",
                    title=content.title,
                    url=url,
                    publishDate=(
                        post.publish_date.isoformat() if post.publish_date else None
                    ),
                    contentType="Blog",
                    relevanceScore=relevance_score,
                )
            )

            # Stop if we have enough results
            if len(results) >= limit:
                break

    except Exception as e:
        logger.error(f"Error searching blog posts: {str(e)}")

    # Remove duplicates and prioritize requested language
    unique_results = {}
    for result in results:
        # Extract base ID (remove language suffix)
        if result.contentType == "Page":
            base_id = result.id.split("-")[1]  # page-123-en -> 123
        else:  # Blog
            base_id = result.id.split("-")[1]  # blog-456-en -> 456

        key = f"{result.contentType.lower()}-{base_id}"

        # Keep the result with higher relevance score, or prefer requested language
        if key not in unique_results:
            unique_results[key] = result
        else:
            existing = unique_results[key]
            # Replace if new result has higher relevance, or same relevance but in requested language
            if result.relevanceScore > existing.relevanceScore or (
                result.relevanceScore == existing.relevanceScore and lang in result.url
            ):
                unique_results[key] = result

    # Convert back to list and sort by relevance score (highest first)
    final_results = list(unique_results.values())
    final_results.sort(key=lambda x: x.relevanceScore, reverse=True)

    # Apply final limit
    final_results = final_results[:limit]

    # Generate suggestions if no results found
    suggestions = []
    if len(final_results) == 0 and q.strip():
        suggestions = generate_search_suggestions(q.strip(), list(all_content_words))

    return SearchResponse(
        results=final_results, total=len(final_results), suggestions=suggestions
    )

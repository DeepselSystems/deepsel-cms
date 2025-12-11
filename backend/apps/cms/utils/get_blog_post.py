from typing import Optional, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from apps.cms.utils.shared_datatypes import SEOMetadata
from apps.cms.types import BlogPostData
from deepsel.utils.models_pool import models_pool


def get_blog_post(
    target_lang: str,
    post_slug: str,
    org_settings: Any,
    db: Session,
    current_user: Optional[Any] = None,
) -> BlogPostData:
    """
    Get blog post content by language and slug.

    Args:
        target_lang: Resolved language ISO code (already determined by parent)
        post_slug: Blog post slug (without /blog prefix)
        org_settings: Organization settings
        db: Database session
        current_user: Optional authenticated user

    Returns:
        dict: Blog post data including content, metadata, and settings
    """
    BlogPostModel = models_pool["blog_post"]

    # Add leading slash if not present (database stores slugs with leading slash)
    post_slug = "/" + post_slug.lstrip("/")

    # Find the blog post with matching slug and organization
    blog_post = (
        db.query(BlogPostModel)
        .filter(
            BlogPostModel.slug == post_slug,
            BlogPostModel.published == True,
            BlogPostModel.organization_id == org_settings.id,
        )
        .first()
    )

    if not blog_post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Blog post not found"
        )

    # Check if login is required for this blog post
    if blog_post.require_login:
        # If login is required, check authentication
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
            )

    if not blog_post.contents:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Blog post not found"
        )

    # Find matching content for the requested language
    matching_content = next(
        (c for c in blog_post.contents if c.locale.iso_code == target_lang), None
    )

    if not matching_content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not available in this language",
        )

    # Get public settings
    settings = org_settings.get_public_settings(
        org_settings.id,
        db,
        lang=target_lang,
    )

    # Prepare SEO metadata
    seo_metadata = SEOMetadata(
        title=matching_content.seo_metadata_title or matching_content.title,
        description=matching_content.seo_metadata_description,
        featured_image_id=matching_content.seo_metadata_featured_image_id,
        featured_image_name=(
            matching_content.seo_metadata_featured_image.name
            if matching_content.seo_metadata_featured_image
            else None
        ),
        allow_indexing=matching_content.seo_metadata_allow_indexing,
    )

    # Convert author to dict if it exists
    author_data = None
    if blog_post.author:
        author_data = {
            "id": blog_post.author.id,
            "display_name": blog_post.author.display_name,
            "username": blog_post.author.username,
            "image": blog_post.author.image.name if blog_post.author.image else None,
        }

    # Build language alternatives
    language_alternatives = [
        {
            "slug": f"/blog{blog_post.slug}",
            "locale": {
                "id": content.locale.id,
                "name": content.locale.name,
                "iso_code": content.locale.iso_code,
            },
        }
        for content in blog_post.contents
        if content.locale.iso_code != matching_content.locale.iso_code
    ]

    # Return blog post data
    return {
        "id": blog_post.id,
        "title": matching_content.title,
        "content": matching_content.content,
        "lang": target_lang,
        "public_settings": settings,
        "seo_metadata": seo_metadata,
        "custom_code": matching_content.custom_code,
        "page_custom_code": blog_post.blog_post_custom_code,
        "require_login": blog_post.require_login,
        "featured_image_id": matching_content.featured_image_id,
        "publish_date": (
            blog_post.publish_date.isoformat() if blog_post.publish_date else None
        ),
        "author": author_data,
        "language_alternatives": language_alternatives,
    }

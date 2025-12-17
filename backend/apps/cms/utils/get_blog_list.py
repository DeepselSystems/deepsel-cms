from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from apps.cms.types import BlogPostListItem
from deepsel.utils.models_pool import models_pool
from traceback import print_exc


def get_blog_list(
    target_lang: str,
    org_settings: Any,
    db: Session,
    current_user: Optional[Any] = None,
) -> Tuple[List[BlogPostListItem], Dict[str, Any], str]:
    """
    Get published blog posts by language for website display.

    Args:
        target_lang: Resolved language ISO code (already determined by parent)
        org_settings: Organization settings
        db: Database session
        current_user: Optional authenticated user

    Returns:
        tuple: (blog_posts, public_settings, target_lang)
    """
    try:
        BlogPostModel = models_pool["blog_post"]
        BlogPostContentModel = models_pool["blog_post_content"]
        LocaleModel = models_pool["locale"]

        # Query published blog posts with content in the specified language
        query = (
            db.query(BlogPostModel, BlogPostContentModel)
            .join(
                BlogPostContentModel, BlogPostModel.id == BlogPostContentModel.post_id
            )
            .join(LocaleModel, BlogPostContentModel.locale_id == LocaleModel.id)
            .filter(
                BlogPostModel.published == True,
                LocaleModel.iso_code == target_lang,
                BlogPostModel.organization_id == org_settings.id,
            )
            .order_by(BlogPostModel.publish_date.desc())
        )

        results = query.all()

        blog_posts = []
        for blog_post, content in results:
            # Skip blog posts that require login if user is not authenticated
            if blog_post.require_login and not current_user:
                continue

            # Convert author to dict if it exists
            author_data = None
            if blog_post.author:
                author_data = {
                    "id": blog_post.author.id,
                    "display_name": blog_post.author.name,
                    "username": blog_post.author.username,
                    "image": (
                        blog_post.author.image.name if blog_post.author.image else None
                    ),
                }

            blog_posts.append(
                {
                    "id": blog_post.id,
                    "title": content.title,
                    "slug": blog_post.slug,
                    "excerpt": content.subtitle,  # Use subtitle as excerpt
                    "featured_image_id": content.featured_image_id,
                    "publish_date": (
                        blog_post.publish_date.isoformat()
                        if blog_post.publish_date
                        else None
                    ),
                    "author": author_data,
                    "lang": target_lang,
                }
            )

        # Get public settings
        settings = org_settings.get_public_settings(
            org_settings.id,
            db,
            lang=target_lang,
        )

        return blog_posts, settings, target_lang

    except Exception:
        # Return empty list instead of error to avoid breaking the website
        print_exc()
        settings = org_settings.get_public_settings(
            org_settings.id,
            db,
            lang=target_lang,
        )
        return [], settings, target_lang

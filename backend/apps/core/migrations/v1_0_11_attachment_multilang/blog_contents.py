import logging

from ._utils import replace_attachment_blocks

logger = logging.getLogger(__name__)


def migrate_blog_contents(db) -> None:
    """Migrate blog post content to use Jinja attachment() calls instead of raw <img> tags."""
    from apps.cms.models.blog_post_content import BlogPostContentModel

    targets = (
        db.query(BlogPostContentModel)
        .filter(
            BlogPostContentModel.content.like("%/api/v1/attachment/serve/%")
            | BlogPostContentModel.content.like("%embed-files-wrapper%"),
        )
        .all()
    )

    logger.info(f"[blog_contents] Found {len(targets)} records to migrate")

    ok = 0
    failed = 0

    for bc in targets:
        try:
            new_content = replace_attachment_blocks(bc.content or "")
            new_draft = (
                replace_attachment_blocks(bc.draft_content or "")
                if bc.draft_content
                else bc.draft_content
            )

            bc.content = new_content
            bc.draft_content = new_draft

            logger.info(f"  [blog_contents] id={bc.id} title={bc.title!r} updated")
            ok += 1
        except Exception as exc:
            logger.error(f"  [blog_contents] id={bc.id}: FAILED — {exc}", exc_info=True)
            failed += 1

    logger.info(f"[blog_contents] done — ok={ok}, failed={failed}")

import logging

from ._utils import replace_attachment_blocks

logger = logging.getLogger(__name__)


def migrate_page_contents(db) -> None:
    """Migrate page content to use Jinja attachment() calls instead of raw <img> tags."""
    from apps.cms.models.page_content import PageContentModel

    targets = (
        db.query(PageContentModel)
        .filter(
            PageContentModel.content.like("%/api/v1/attachment/serve/%")
            | PageContentModel.content.like("%embed-files-wrapper%"),
        )
        .all()
    )

    logger.info(f"[page_contents] Found {len(targets)} records to migrate")

    ok = 0
    failed = 0

    for pc in targets:
        try:
            new_content = replace_attachment_blocks(pc.content or "")
            new_draft = (
                replace_attachment_blocks(pc.draft_content or "")
                if pc.draft_content
                else pc.draft_content
            )

            pc.content = new_content
            pc.draft_content = new_draft

            logger.info(f"  [page_contents] id={pc.id} title={pc.title!r} updated")
            ok += 1
        except Exception as exc:
            logger.error(f"  [page_contents] id={pc.id}: FAILED — {exc}", exc_info=True)
            failed += 1

    logger.info(f"[page_contents] done — ok={ok}, failed={failed}")

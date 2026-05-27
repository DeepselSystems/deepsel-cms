import logging

from deepsel.utils.migration_utils import migration_task

from .attachments import migrate_attachments
from .blog_contents import migrate_blog_contents
from .page_contents import migrate_page_contents

logger = logging.getLogger(__name__)


@migration_task(
    "Migrate attachments to multi-locale structure and update content references",
    "1.0.11",
)
def migrate(db, *args, **kwargs):
    try:
        migrate_attachments(db)
        migrate_page_contents(db)
        migrate_blog_contents(db)
        db.commit()
        logger.info("Attachment multi-lang migration completed.")
    except Exception as exc:
        logger.error(f"Attachment multi-lang migration failed: {exc}")
        db.rollback()
        raise

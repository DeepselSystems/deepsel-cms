from datetime import datetime, timezone
from sqlalchemy import text as sa_text
from sqlalchemy.orm import Session
from typing import Optional


class BlogPostContentMixin:
    """Business logic for blog post content: search vectors and timestamp tracking.

    Revisions are created by the publish flow (see routers/draft.py), not here.
    """

    @staticmethod
    def _update_search_vector(db: Session, record):
        """Populate the tsvector column from title + plain-text content."""
        from apps.cms.utils.search import strip_html_tags

        body = strip_html_tags(record.content)
        db.execute(
            sa_text(
                "UPDATE blog_post_content SET search_vector = "
                "setweight(to_tsvector('simple', coalesce(:title, '')), 'A') || "
                "setweight(to_tsvector('simple', coalesce(:body, '')), 'B') "
                "WHERE id = :id"
            ),
            {"title": record.title or "", "body": body, "id": record.id},
        )

    @classmethod
    def create(cls, db: Session, user, values: dict, *args, **kwargs):
        res = super().create(db, user, values, *args, **kwargs)
        cls._update_search_vector(db, res)
        return res

    def update(
        self,
        db: Session,
        user,
        values: dict,
        commit: Optional[bool] = True,
        *args,
        **kwargs,
    ):
        values["last_modified_at"] = datetime.now(timezone.utc)
        values["updated_by_id"] = user.id if user else None

        res = super().update(db, user, values, commit, *args, **kwargs)
        self._update_search_vector(db, res)
        return res

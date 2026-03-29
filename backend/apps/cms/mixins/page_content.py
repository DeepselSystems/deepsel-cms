from datetime import datetime, timezone
from sqlalchemy import text as sa_text
from sqlalchemy.orm import Session
from typing import Optional


class PageContentMixin:
    """Business logic for page content: search vectors and revision tracking."""

    @staticmethod
    def _update_search_vector(db: Session, record):
        """Populate the tsvector column from title + plain-text content."""
        from apps.cms.utils.search import extract_page_plain_text

        body = extract_page_plain_text(record.content)
        db.execute(
            sa_text(
                "UPDATE page_content SET search_vector = "
                "setweight(to_tsvector('simple', coalesce(:title, '')), 'A') || "
                "setweight(to_tsvector('simple', coalesce(:body, '')), 'B') "
                "WHERE id = :id"
            ),
            {"title": record.title or "", "body": body, "id": record.id},
        )

    @classmethod
    def create(cls, db: Session, user, values: dict, *args, **kwargs):
        from apps.core.utils.models_pool import models_pool

        res = super().create(db, user, values, *args, **kwargs)
        cls._update_search_vector(db, res)
        PageContentRevisionModel = models_pool["page_content_revision"]
        # Get next revision number (starting at 1 for initial revision)
        revision_count = (
            db.query(PageContentRevisionModel).filter_by(page_content_id=res.id).count()
        )
        revision_number = revision_count + 1
        if revision_number == 1:
            name = f"Initial revision by {user.username or user.email or 'system'}"
        else:
            name = f"Edited by {user.username or user.email or 'system'}"
        PageContentRevisionModel.create(
            db,
            user,
            {
                "page_content_id": res.id,
                "old_content": None,
                "new_content": res.content,
                "name": name,
                "revision_number": revision_number,
            },
        )
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
        from apps.core.utils.models_pool import models_pool

        old_content = self.content
        new_content = values.get("content")

        # Always update the last_modified_at timestamp and updated_by
        values["last_modified_at"] = datetime.now(timezone.utc)
        values["updated_by_id"] = user.id if user else None

        res = super().update(db, user, values, commit, *args, **kwargs)
        self._update_search_vector(db, res)
        if old_content != new_content:
            PageContentRevisionModel = models_pool["page_content_revision"]
            # Get next revision number
            revision_count = (
                db.query(PageContentRevisionModel)
                .filter_by(page_content_id=self.id)
                .count()
            )
            revision_number = revision_count + 1

            PageContentRevisionModel.create(
                db,
                user,
                {
                    "page_content_id": self.id,
                    "old_content": old_content,
                    "new_content": new_content,
                    "name": f"Edited by {user.username or user.email or 'system'}",
                    "revision_number": revision_number,
                },
            )
        return res

from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Index,
    JSON,
    Boolean,
    Text,
    DateTime,
)
from datetime import datetime, timezone
from db import Base
from apps.deepsel.mixins.base_model import BaseModel
from sqlalchemy.orm import relationship, Session
from apps.deepsel.models.user import UserModel
from apps.deepsel.utils.models_pool import models_pool
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class PageContentModel(Base, BaseModel):
    __tablename__ = "page_content"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(JSON)
    slug = Column(String(255), nullable=True)

    locale_id = Column(Integer, ForeignKey("locale.id"), nullable=False)
    locale = relationship("LocaleModel")

    page_id = Column(Integer, ForeignKey("page.id"), nullable=False)
    page = relationship("PageModel", back_populates="contents")

    seo_metadata_title = Column(
        String(255),
        nullable=True,
    )  # SEO title - defaults to associated content title
    seo_metadata_description = Column(
        Text,
        nullable=True,
    )  # SEO description - meta description for search results
    seo_metadata_featured_image_id = Column(
        Integer,
        ForeignKey("attachment.id"),
        nullable=True,
    )  # Featured image for social sharing and search results
    seo_metadata_featured_image = relationship("AttachmentModel")
    seo_metadata_allow_indexing = Column(
        Boolean,
        default=True,
        nullable=True,
    )  # Allow search engine indexing

    # Custom code field
    custom_code = Column(Text, nullable=True)  # Language-specific custom code

    # Conflict resolution fields
    last_modified_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    updated_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    updated_by = relationship("UserModel", foreign_keys=[updated_by_id])

    revisions = relationship(
        "PageContentRevisionModel",
        back_populates="page_content",
        cascade="all, delete-orphan",
        order_by="PageContentRevisionModel.created_at.desc()",
    )

    # Create a composite index on page_id and slug for faster lookups
    __table_args__ = (Index("idx_page_content_page_id_slug", "page_id", "slug"),)

    @classmethod
    def create(
        cls, db: Session, user: UserModel, values: dict, *args, **kwargs
    ) -> "PageContentModel":
        res = super().create(db, user, values, *args, **kwargs)
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
                "new_content": (
                    res.content.get("main", {}).get("ds-value") if res.content else None
                ),
                "name": name,
                "revision_number": revision_number,
            },
        )
        return res

    def update(
        self,
        db: Session,
        user: "UserModel",
        values: dict,
        commit: Optional[bool] = True,
        *args,
        **kwargs,
    ) -> "PageContentModel":
        old_content = (
            self.content.get("main", {}).get("ds-value") if self.content else None
        )
        new_content = (
            values.get("content", {}).get("main", {}).get("ds-value")
            if values.get("content")
            else None
        )

        # Always update the last_modified_at timestamp and updated_by
        values["last_modified_at"] = datetime.now(timezone.utc)
        values["updated_by_id"] = user.id if user else None

        res = super().update(db, user, values, commit, *args, **kwargs)
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

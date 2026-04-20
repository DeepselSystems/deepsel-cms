from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Index,
    Boolean,
    Text,
    DateTime,
)
from apps.cms.utils.tsvector import TSVector
from db import Base
from apps.core.mixins.base_model import BaseModel
from apps.cms.mixins.page_content import PageContentMixin
from sqlalchemy.orm import relationship


class PageContentModel(Base, PageContentMixin, BaseModel):
    __tablename__ = "page_content"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(Text)
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
    seo_metadata_featured_image = relationship(
        "AttachmentModel", foreign_keys=[seo_metadata_featured_image_id]
    )
    seo_metadata_allow_indexing = Column(
        Boolean,
        default=True,
        nullable=True,
    )  # Allow search engine indexing

    # Custom code field
    custom_code = Column(Text, nullable=True)  # Language-specific custom code

    # Per-language publish state. Each content row has its own live flag so
    # languages can be published/unpublished independently. The parent
    # page.published flag is derived from this (any True -> parent True).
    published = Column(Boolean, default=False, nullable=False)
    last_modified_at = Column(DateTime, nullable=True)
    updated_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    updated_by = relationship("UserModel", foreign_keys=[updated_by_id])

    # Draft fields — autosave writes here; publish copies draft_* -> live fields.
    has_draft = Column(Boolean, default=False, nullable=False)
    draft_title = Column(String, nullable=True)
    draft_content = Column(Text, nullable=True)
    draft_seo_metadata_title = Column(String(255), nullable=True)
    draft_seo_metadata_description = Column(Text, nullable=True)
    draft_seo_metadata_featured_image_id = Column(
        Integer, ForeignKey("attachment.id"), nullable=True
    )
    draft_seo_metadata_featured_image = relationship(
        "AttachmentModel", foreign_keys=[draft_seo_metadata_featured_image_id]
    )
    draft_seo_metadata_allow_indexing = Column(Boolean, nullable=True)
    draft_custom_code = Column(Text, nullable=True)
    draft_last_modified_at = Column(DateTime, nullable=True)
    draft_updated_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    draft_updated_by = relationship("UserModel", foreign_keys=[draft_updated_by_id])

    search_vector = Column(TSVector)

    revisions = relationship(
        "PageContentRevisionModel",
        back_populates="page_content",
        cascade="all, delete-orphan",
        order_by="PageContentRevisionModel.created_at.desc()",
    )

    __table_args__ = (
        Index("idx_page_content_page_id_slug", "page_id", "slug"),
        Index(
            "idx_page_content_search_vector",
            "search_vector",
            postgresql_using="gin",
        ),
    )

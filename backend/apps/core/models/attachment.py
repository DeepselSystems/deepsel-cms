import os
from typing import Optional

from sqlalchemy import Column, Enum, Integer, String
from sqlalchemy.orm import joinedload, relationship, Session

from db import Base
from apps.core.mixins.base_model import BaseModel
from deepsel.orm.attachment_mixin import AttachmentTypeOptions


class AttachmentModel(Base, BaseModel):
    __tablename__ = "attachment"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=True)

    # Deprecated: these single-lang fields are superseded by AttachmentLocaleVersionModel.
    # Retained for data integrity — do not use in new code. Use locale_versions instead.
    type = Column(Enum(AttachmentTypeOptions), nullable=True)
    content_type = Column(String)
    filesize = Column(Integer, nullable=True)
    alt_text = Column(String, nullable=True)

    local_directory = os.path.join("files")

    locale_versions = relationship(
        "AttachmentLocaleVersionModel",
        back_populates="attachment",
        cascade="all, delete-orphan",
    )

    @classmethod
    def _get_bulk_delete_query_options(cls):
        """Eagerly load locale_versions so they remain accessible on detached instances after commit."""
        return [joinedload(cls.locale_versions)]

    @classmethod
    def get_by_name(cls, db: Session, name: str):
        return db.query(cls).filter(cls.name == name).first()

    @classmethod
    def bulk_delete(
        cls,
        db: Session,
        user,
        search,
        force: Optional[bool] = False,
        bypass_permission: Optional[bool] = False,
        *args,
        **kwargs,
    ):
        """Override bulk_delete to clean up storage files for all locale versions."""
        # Avoid circular import: attachment.py <-> attachment_locale_version.py
        from apps.core.models.attachment_locale_version import (
            AttachmentLocaleVersionModel,
        )

        response = super().bulk_delete(
            db=db,
            user=user,
            search=search,
            force=force,
            bypass_permission=bypass_permission,
            *args,
            **kwargs,
        )

        for attachment in response.deleted_records:
            for version in attachment.locale_versions:
                AttachmentLocaleVersionModel.delete_from_storage(
                    version.name, version.type
                )

        return response

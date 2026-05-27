import os

from sqlalchemy import Column, Enum, Integer, String
from sqlalchemy.orm import relationship, Session

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
    def get_by_name(cls, db: Session, name: str):
        return db.query(cls).filter(cls.name == name).first()

    @classmethod
    def create(cls, db, user, organization_id, name=None, commit=True, *args, **kwargs):
        # Overrides BaseModel.create() to be DB-only: no file upload, no storage logic.
        # All file handling (upload, validation, ClamAV scan, S3/Azure/local storage)
        # is delegated to AttachmentLocaleVersionModel, one record per locale per attachment.
        attachment = AttachmentModel(
            owner_id=user.id, organization_id=organization_id, name=name, **kwargs
        )
        db.add(attachment)
        if commit:
            db.commit()
        return attachment

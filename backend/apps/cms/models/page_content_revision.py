from sqlalchemy import Column, Integer, String, ForeignKey
from db import Base
from deepsel.mixins.base_model import BaseModel
from sqlalchemy.orm import relationship


class PageContentRevisionModel(Base, BaseModel):
    __tablename__ = "page_content_revision"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=True)
    revision_number = Column(
        Integer, nullable=True
    )  # Sequential number for this content

    page_content_id = Column(Integer, ForeignKey("page_content.id"), nullable=True)
    page_content = relationship("PageContentModel", foreign_keys=[page_content_id])

    old_content = Column(String)
    new_content = Column(String)

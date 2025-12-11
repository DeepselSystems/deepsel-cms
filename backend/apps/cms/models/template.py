from sqlalchemy import Column, Integer, Text, Boolean
from db import Base
from deepsel.mixins.base_model import BaseModel
from deepsel.mixins.activity import ActivityMixin
from sqlalchemy.orm import relationship


class TemplateModel(Base, ActivityMixin, BaseModel):
    __tablename__ = "template"
    __tracked_fields__ = ["name", "published"]

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    contents = relationship("TemplateContentModel", back_populates="template")

    is_404 = Column(Boolean, default=False)
    is_login = Column(Boolean, default=False)

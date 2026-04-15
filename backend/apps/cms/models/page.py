from sqlalchemy import Column, Integer, Boolean, Text
from db import Base
from apps.core.mixins.base_model import BaseModel
from deepsel.orm import ActivityMixin
from apps.cms.mixins.page import PageMixin
from sqlalchemy.orm import relationship


class PageModel(Base, ActivityMixin, PageMixin, BaseModel):
    __tablename__ = "page"
    __tracked_fields__ = ["published"]

    @classmethod
    def _get_activity_model(cls):
        from apps.core.models.activity import ActivityModel, ActivityType

        return ActivityModel, ActivityType

    id = Column(Integer, primary_key=True)
    published = Column(Boolean, default=False)

    is_homepage = Column(Boolean, default=False)

    # Require login to view page content
    require_login = Column(Boolean, default=False)

    # Custom code field for all languages
    page_custom_code = Column(Text, nullable=True)

    contents = relationship(
        "PageContentModel",
        back_populates="page",
        cascade="all, delete-orphan",
    )

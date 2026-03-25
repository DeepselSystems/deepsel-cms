from sqlalchemy import Column, Integer, Text, String
from db import Base
from apps.core.mixins.base_model import BaseModel
from deepsel.orm import ActivityMixin
from sqlalchemy.orm import relationship


class ThemeFileModel(Base, ActivityMixin, BaseModel):
    __tablename__ = "theme_file"
    __tracked_fields__ = ["theme_name", "file_path"]

    @classmethod
    def _get_activity_model(cls):
        from apps.core.models.activity import ActivityModel, ActivityType

        return ActivityModel, ActivityType

    id = Column(Integer, primary_key=True)
    theme_name = Column(String(255), nullable=False)  # e.g., "starter_react"
    file_path = Column(Text, nullable=False)  # e.g., "components/Header.tsx"
    contents = relationship(
        "ThemeFileContentModel",
        back_populates="theme_file",
        cascade="all, delete-orphan",
    )

from sqlalchemy import Column, Integer, Text, String
from db import Base
from deepsel.mixins.base_model import BaseModel
from deepsel.mixins.activity import ActivityMixin
from sqlalchemy.orm import relationship


class ThemeFileModel(Base, ActivityMixin, BaseModel):
    __tablename__ = "theme_file"
    __tracked_fields__ = ["theme_name", "file_path"]

    id = Column(Integer, primary_key=True)
    theme_name = Column(String(255), nullable=False)  # e.g., "interlinked"
    file_path = Column(Text, nullable=False)  # e.g., "components/Header.tsx"
    contents = relationship(
        "ThemeFileContentModel",
        back_populates="theme_file",
        cascade="all, delete-orphan",
    )

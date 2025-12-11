from sqlalchemy import Column, Integer, String, ForeignKey, Text
from db import Base
from deepsel.mixins.base_model import BaseModel
from sqlalchemy.orm import relationship


class BlogPostContentRevisionModel(Base, BaseModel):
    __tablename__ = "blog_post_content_revision"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=True)
    revision_number = Column(
        Integer, nullable=True
    )  # Sequential number for this content

    blog_post_content_id = Column(
        Integer, ForeignKey("blog_post_content.id"), nullable=True
    )
    blog_post_content = relationship(
        "BlogPostContentModel", foreign_keys=[blog_post_content_id]
    )

    old_content = Column(Text)
    new_content = Column(Text)

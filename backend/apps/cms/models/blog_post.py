from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Text
from datetime import datetime
from db import Base
from apps.core.mixins.base_model import BaseModel
from deepsel.orm import ActivityMixin
from apps.cms.mixins.blog_post import BlogPostMixin
from sqlalchemy.orm import relationship


class BlogPostModel(Base, ActivityMixin, BlogPostMixin, BaseModel):
    __tablename__ = "blog_post"
    __tracked_fields__ = ["published"]

    @classmethod
    def _get_activity_model(cls):
        from apps.core.models.activity import ActivityModel, ActivityType

        return ActivityModel, ActivityType

    id = Column(Integer, primary_key=True)
    published = Column(Boolean, default=False)
    slug = Column(String(255), nullable=True, index=True)
    publish_date = Column(DateTime, default=datetime.utcnow)

    # Author reference
    author_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    author = relationship("UserModel", foreign_keys=[author_id])

    # Require login to view blog post content
    require_login = Column(Boolean, default=False)

    # Custom code field for all languages
    blog_post_custom_code = Column(Text, nullable=True)

    contents = relationship(
        "BlogPostContentModel",
        back_populates="post",
        cascade="all, delete-orphan",
    )

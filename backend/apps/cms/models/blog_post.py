from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Text
from datetime import datetime
from db import Base
from apps.deepsel.mixins.base_model import BaseModel
from apps.deepsel.mixins.activity import ActivityMixin
from apps.deepsel.mixins.orm import (
    PAGINATION,
    SearchQuery,
    OrderByCriteria,
    SearchCriteria,
)
from apps.deepsel.models.user import UserModel
from sqlalchemy.orm import relationship, Session
from fastapi import HTTPException, status
from typing import Optional


class BlogPostModel(Base, ActivityMixin, BaseModel):
    __tablename__ = "blog_post"
    __tracked_fields__ = ["published"]

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

    contents = relationship("BlogPostContentModel", back_populates="post")

    @classmethod
    def get_one(
        cls, db: Session, user: UserModel, item_id: int, *args, **kwargs
    ) -> "BlogPostModel":
        res = db.query(cls).get(item_id)
        # check if user is public user
        # if yes filter by published=True
        if user.is_public_user():
            if not res.published:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Item not found",
                )
        return res

    @classmethod
    def search(
        cls,
        db: Session,
        user: UserModel,
        pagination: PAGINATION,
        search: Optional[SearchQuery] = None,
        order_by: Optional[OrderByCriteria] = None,
        *args,
        **kwargs,
    ):
        # check if user is public user
        # if yes filter by published=True
        if user.is_public_user():
            search = search or SearchQuery()
            if search.AND is None:
                search.AND = []
            search.AND.append(
                SearchCriteria(field="published", operator="=", value=True)
            )

        return super().search(db, user, pagination, search, order_by, *args, **kwargs)

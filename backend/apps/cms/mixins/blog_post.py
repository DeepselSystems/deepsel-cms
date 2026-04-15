from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
from deepsel.orm import (
    PAGINATION,
    SearchQuery,
    OrderByCriteria,
    SearchCriteria,
)


class BlogPostMixin:
    """Business logic for blog posts: published-only filtering for anonymous callers."""

    @classmethod
    def create(cls, db: Session, user, values: dict, *args, **kwargs):
        if values.get("slug"):
            values["slug"] = cls._normalize_slug(values["slug"])
        return super().create(db, user, values, *args, **kwargs)

    def update(
        self,
        db: Session,
        user,
        values: dict,
        commit: Optional[bool] = True,
        *args,
        **kwargs,
    ):
        if values.get("slug"):
            values["slug"] = self._normalize_slug(values["slug"])
        return super().update(db, user, values, commit, *args, **kwargs)

    @staticmethod
    def _normalize_slug(slug: str) -> str:
        """Ensure blog post slug is stored with a leading forward slash (matches page pattern)."""
        if not slug:
            return slug
        return slug if slug.startswith("/") else f"/{slug}"

    @classmethod
    def get_one(cls, db: Session, user, item_id: int, *args, **kwargs):
        res = db.query(cls).get(item_id)
        if user is None or not user.signed_up:
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
        user,
        pagination: PAGINATION,
        search: Optional[SearchQuery] = None,
        order_by: Optional[OrderByCriteria] = None,
        *args,
        **kwargs,
    ):
        if user is None or not user.signed_up:
            search = search or SearchQuery()
            if search.AND is None:
                search.AND = []
            search.AND.append(
                SearchCriteria(field="published", operator="=", value=True)
            )

        return super().search(db, user, pagination, search, order_by, *args, **kwargs)

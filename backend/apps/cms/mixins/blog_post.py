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
    """Business logic for blog posts: public user filtering on get_one and search."""

    @classmethod
    def get_one(cls, db: Session, user, item_id: int, *args, **kwargs):
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
        user,
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

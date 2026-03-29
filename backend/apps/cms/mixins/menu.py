from sqlalchemy.orm import Session
from typing import Optional
from deepsel.orm import (
    PAGINATION,
    SearchQuery,
    OrderByCriteria,
)


class MenuMixin:
    """Business logic for menus: simplified get_one and default position ordering."""

    @classmethod
    def get_one(cls, db: Session, user, item_id: int, *args, **kwargs):
        res = db.query(cls).get(item_id)
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
        # Default ordering by position
        if order_by is None:
            order_by = OrderByCriteria(field="position", direction="asc")

        return super().search(db, user, pagination, search, order_by, *args, **kwargs)

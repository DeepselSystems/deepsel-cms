from typing import Optional
from fastapi import Depends
from sqlalchemy.orm import Session
from db import get_db
from apps.deepsel.utils.get_current_user import get_current_user


def get_graphql_context(
    db: Session = Depends(get_db), user=Depends(get_current_user)
) -> dict:
    """Return GraphQL context as dictionary"""
    return {"db": db, "user": user}

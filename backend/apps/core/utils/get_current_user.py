from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from deepsel.utils.api_router import get_api_prefix
from jwt import PyJWTError
from sqlalchemy.orm import Session

from settings import (
    APP_SECRET,
    AUTH_ALGORITHM,
    DEFAULT_ORG_ID,
    AUTHLESS,
    SESSION_COOKIE_NAME,
)
from db import get_db
from apps.core.utils.models_pool import models_pool

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{get_api_prefix()}/token", auto_error=False
)


def _get_session_store(request: Request):
    """Get session store from app state, or None if not initialized."""
    return getattr(request.app.state, "session_store", None)


def _resolve_user_from_session(request: Request, db: Session):
    """Try to authenticate via session cookie. Returns user or None."""
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id:
        return None

    session_store = _get_session_store(request)
    if not session_store:
        return None

    session_data = session_store.get(session_id)
    if session_data is None:
        return None

    UserModel = models_pool["user"]
    user = db.query(UserModel).get(session_data.user_id)
    return user


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    UserModel = models_pool["user"]
    OrgModel = models_pool["organization"]
    org = db.query(OrgModel).get(DEFAULT_ORG_ID)

    if AUTHLESS and org and not org.enable_auth:
        # Return admin user when AUTHLESS=True
        user = (
            db.query(UserModel)
            .filter_by(
                string_id="admin_user",
            )
            .first()
        )
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No admin user found for authless mode",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    # 1. Try session cookie first (browser requests)
    session_user = _resolve_user_from_session(request, db)
    if session_user is not None:
        return session_user

    # 2. Fall back to Bearer token (API clients, backward compat)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, APP_SECRET, algorithms=[AUTH_ALGORITHM])
        owner_id: str = payload.get("uid")
        if not owner_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials payload",
            )
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    user = db.query(UserModel).get(owner_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate user",
        )

    anon_only = payload.get("anon_only", False)
    if user.signed_up and anon_only:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credentials are only valid for anonymous users",
        )
    return user


def get_current_user_optional(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Optional authentication - returns user if authenticated, None if not.
    Does not raise exceptions for missing or invalid tokens.
    """
    UserModel = models_pool["user"]

    # 1. Try session cookie
    session_user = _resolve_user_from_session(request, db)
    if session_user is not None:
        return session_user

    # 2. Try Bearer token
    if token is None:
        return None

    try:
        payload = jwt.decode(token, APP_SECRET, algorithms=[AUTH_ALGORITHM])
        owner_id: str = payload.get("uid")
        if not owner_id:
            return None
    except PyJWTError:
        return None

    user = db.query(UserModel).get(owner_id)
    if user is None:
        return None

    anon_only = payload.get("anon_only", False)
    if user.signed_up and anon_only:
        return None

    return user

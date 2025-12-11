from typing import Optional
import os
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import PyJWTError
from sqlalchemy.orm import Session
from constants import APP_SECRET, AUTH_ALGORITHM, DEFAULT_ORG_ID, AUTHLESS
from db import get_db
from deepsel.utils.models_pool import models_pool

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)
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

    if token is None:
        # public user with string_id = 'public_user'
        user = (
            db.query(UserModel)
            .filter_by(
                string_id="public_user",
                organization_id=DEFAULT_ORG_ID,
            )
            .first()
        )
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No default user for empty credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

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
    token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    """
    Optional authentication - returns user if authenticated, None if not.
    Does not raise exceptions for missing or invalid tokens.
    """
    UserModel = models_pool["user"]

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

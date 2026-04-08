import logging
from typing import Optional
from urllib.parse import quote

from fastapi import Body, Depends, Form, Request
from fastapi.responses import RedirectResponse, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing_extensions import Annotated

from settings import (
    APP_SECRET,
    AUTH_ALGORITHM,
    DEFAULT_ORG_ID,
    PUBLIC_URL,
    SESSION_COOKIE_SECURE,
    SESSION_COOKIE_NAME,
)
from db import get_db
from apps.core.schemas.user import CurrentUser
from apps.core.schemas.auth import (
    UserInitSubmission,
    UserSignupSubmission,
    TokenResponse,
    InitAnonymousUserResponse,
    SignupResponse,
    ResetPasswordResponse,
    ResetPasswordRequestSubmission,
    ResetPasswordSubmission,
    ChangePasswordSubmission,
    Info2FaDto,
    UserReadSchema,
)
from deepsel.utils.crypto import encrypt, decrypt
from apps.core.utils.get_current_user import get_current_user
from apps.core.utils.models_pool import models_pool
from deepsel.utils.crypto import crypt_context as pwd_context
from deepsel.utils.api_router import create_api_router
from deepsel.auth.service import AuthService
from deepsel.auth.google_oauth import GoogleOAuthService
from deepsel.auth.saml import SamlService

logger = logging.getLogger(__name__)

router = create_api_router(tags=["Authentication"])
UserModel = models_pool["user"]

auth_service = AuthService(
    app_secret=APP_SECRET,
    auth_algorithm=AUTH_ALGORITHM,
    default_org_id=DEFAULT_ORG_ID,
    password_context=pwd_context,
    encrypt_fn=lambda text: encrypt(text, APP_SECRET),
    decrypt_fn=lambda text: decrypt(text, APP_SECRET),
)
google_service = GoogleOAuthService(APP_SECRET, AUTH_ALGORITHM, PUBLIC_URL)
saml_service = SamlService(
    APP_SECRET, AUTH_ALGORITHM, DEFAULT_ORG_ID, PUBLIC_URL, PUBLIC_URL
)


def _get_session_store(request: Request):
    return getattr(request.app.state, "session_store", None)


def _set_session_cookie(response: Response, session_id: str, max_age: int):
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


def _clear_session_cookie(response: Response):
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def _build_current_user(user):
    permissions = user.get_user_permissions()
    all_roles = user.get_user_roles()
    return CurrentUser(
        **UserReadSchema.model_validate(user, from_attributes=True).dict(),
        permissions=permissions,
        all_roles=all_roles,
    )


@router.post("/token", response_model=TokenResponse)
def login_for_access_token(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
    otp: Optional[str] = Form(None),
):
    # Inject session store if available
    session_store = _get_session_store(request)
    auth_service.session_store = session_store

    result = auth_service.login(db, form_data.username, form_data.password, otp)

    if result.require_2fa_setup:
        return TokenResponse(
            access_token="",  # nosec B106
            user=None,
            is_require_user_config_2fa=True,
        )

    current_user = _build_current_user(result.user)
    response_data = TokenResponse(
        access_token=result.access_token,
        user=current_user,
        is_require_user_config_2fa=False,
    )

    # Set session cookie if session was created
    response = Response(
        content=response_data.model_dump_json(),
        media_type="application/json",
    )
    if result.session_id:
        # Default 24h, can be org-specific
        max_age = 60 * 60 * 24
        if result.user and result.user.organization:
            org_minutes = result.user.organization.access_token_expire_minutes
            if org_minutes:
                max_age = int(org_minutes * 60)
        _set_session_cookie(response, result.session_id, max_age)

    return response


@router.post("/logout")
def logout(request: Request):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    session_store = _get_session_store(request)

    if session_id and session_store:
        session_store.delete(session_id)

    response = Response(
        content='{"success": true}',
        media_type="application/json",
    )
    _clear_session_cookie(response)
    return response


@router.post("/signup", response_model=SignupResponse)
def signup(user_data: UserSignupSubmission, db: Session = Depends(get_db)):
    result = auth_service.signup(
        db,
        user_data.email,
        user_data.password,
        user_data.organization_id,
        invitation_token=user_data.token,
    )
    return {"success": result.success, "id": result.user_id}


@router.post("/init", response_model=InitAnonymousUserResponse)
def create_anonymous_user(init_data: UserInitSubmission, db: Session = Depends(get_db)):
    extra = init_data.model_dump(exclude={"anonymous_id", "organization_id"})
    result = auth_service.init_anonymous_user(
        db, init_data.anonymous_id, init_data.organization_id, **extra
    )
    return {"token": result.token, "user": result.user}


@router.post("/reset-password-request")
async def reset_password_request(
    input: ResetPasswordRequestSubmission, db: Session = Depends(get_db)
):
    ok = await auth_service.request_password_reset(db, input.mixin_id)
    return {"success": ok}


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(input: ResetPasswordSubmission, db: Session = Depends(get_db)):
    result = auth_service.reset_password(
        db,
        input.token,
        input.new_password,
        crosscheck_otp=input.crosscheck_otp,
        should_confirm_2fa=input.should_confirm_2fa_when_change_password,
    )
    return {
        "success": result.success,
        "recovery_codes": result.recovery_codes,
    }


@router.post("/change-password")
def change_password(
    input: ChangePasswordSubmission,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service.change_password(db, user, input.old_password, input.new_password)
    return {"success": True}


@router.post("/check-2fa-config")
def check_2fa_config(
    token: Annotated[str, Body(embed=True)], db: Session = Depends(get_db)
) -> Info2FaDto:
    result = auth_service.check_2fa_config(db, token)
    return Info2FaDto(
        is_organization_require_2fa=result.is_org_require_2fa,
        is_already_config_2fa=result.is_already_configured,
        totp_uri=result.totp_uri,
    )


# --- Google OAuth ---


@router.get("/login/google")
async def login_google(request: Request, db=Depends(get_db)):
    return await google_service.initiate_login(request, db)


@router.get("/auth/google")
async def auth_google(request: Request, db: Session = Depends(get_db)):
    result = await google_service.handle_callback(request, db)

    # Create session and set cookie on redirect
    session_store = _get_session_store(request)
    redirect_url = f"{PUBLIC_URL}/admin/google-authenticated"

    if session_store:
        auth_service.session_store = session_store
        session_id = auth_service.create_session(
            result.user,
            db=db,
            ip=request.client.host if request.client else "",
            user_agent=request.headers.get("user-agent", ""),
        )
        if session_id:
            response = RedirectResponse(redirect_url)
            max_age = 60 * 60 * 24
            if result.organization and result.organization.access_token_expire_minutes:
                max_age = int(result.organization.access_token_expire_minutes * 60)
            _set_session_cookie(response, session_id, max_age)
            return response

    # Fallback: pass token in URL (backward compat)
    return RedirectResponse(f"{redirect_url}?access_token={result.access_token}")


# --- SAML ---


@router.get("/login/saml")
async def login_saml(
    request: Request, db: Session = Depends(get_db), redirect: str = None
):
    sso_url = await saml_service.initiate_login(request, db, redirect)
    return RedirectResponse(sso_url)


@router.post("/auth/saml")
async def auth_saml(request: Request, db: Session = Depends(get_db)):
    result = await saml_service.handle_assertion(request, db)

    redirect_path = "/admin/saml-authenticated"
    if result.relay_state:
        redirect_path += f"?redirect={quote(result.relay_state, safe='')}"

    # Create session and set cookie on redirect
    session_store = _get_session_store(request)
    if session_store:
        auth_service.session_store = session_store
        session_id = auth_service.create_session(
            result.user,
            db=db,
            ip=request.client.host if request.client else "",
            user_agent=request.headers.get("user-agent", ""),
        )
        if session_id:
            response = RedirectResponse(f"{PUBLIC_URL}{redirect_path}")
            max_age = 60 * 60 * 24
            if result.organization and result.organization.access_token_expire_minutes:
                max_age = int(result.organization.access_token_expire_minutes * 60)
            _set_session_cookie(response, session_id, max_age)
            return response

    # Fallback: pass token in URL
    separator = "&" if "?" in redirect_path else "?"
    return RedirectResponse(
        f"{PUBLIC_URL}{redirect_path}{separator}access_token={result.access_token}"
    )


@router.get("/saml/metadata")
async def saml_metadata(db: Session = Depends(get_db)):
    metadata = saml_service.get_metadata(db)
    return Response(
        content=metadata,
        media_type="application/xml",
        headers={"Content-Disposition": "attachment; filename=metadata.xml"},
    )

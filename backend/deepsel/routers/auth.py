import json
import logging
from datetime import UTC, datetime, timedelta
from typing import Optional
from uuid import UUID, uuid4

import jwt
import pyotp
from authlib.integrations.base_client import OAuthError
from authlib.integrations.starlette_client import OAuth
from authlib.oauth2.rfc6749 import OAuth2Token
from fastapi import APIRouter, Body, Depends, Form, HTTPException, Request, status
from fastapi.responses import RedirectResponse, Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session
from starlette.config import Config
from typing_extensions import Annotated
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.settings import OneLogin_Saml2_Settings

from constants import (
    APP_SECRET,
    AUTH_ALGORITHM,
    DEFAULT_ORG_ID,
    FRONTEND_URL,
    BACKEND_URL,
)
from db import get_db
from deepsel.routers.user import CurrentUser
from deepsel.utils import (
    decrypt,
    encrypt,
    generate_recovery_codes,
    get_valid_recovery_code_index,
    hash_text,
)
from deepsel.utils.generate_crud_schemas import generate_read_schema
from deepsel.utils.get_current_user import get_current_user
from deepsel.utils.models_pool import models_pool
from deepsel.utils.pwd_context import pwd_context
from deepsel.utils.api_router import create_api_router

logger = logging.getLogger(__name__)


router = create_api_router(tags=["Authentication"])
RoleModel = models_pool["role"]
UserModel = models_pool["user"]
OrganizationModel = models_pool["organization"]
EmailTemplateModel = models_pool["email_template"]
UserReadSchema = generate_read_schema(UserModel)


class UserInitSubmission(BaseModel):
    device_info: dict
    organization_id: int
    anonymous_id: UUID


class UserSignupSubmission(BaseModel):
    email: str
    password: str
    organization_id: int
    token: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    user: CurrentUser | None
    is_require_user_config_2fa: bool


class InitAnonymousUserResponse(BaseModel):
    token: str
    user: UserReadSchema


class SignupResponse(BaseModel):
    success: bool
    id: int


class ResetPasswordResponse(BaseModel):
    success: bool
    recovery_codes: list[str] = []


class ResetPasswordRequestSubmission(BaseModel):
    mixin_id: str  # email or username


class ResetPasswordSubmission(BaseModel):
    token: str
    new_password: str
    should_confirm_2fa_when_change_password: bool = False
    crosscheck_otp: str = None


class ChangePasswordSubmission(BaseModel):
    old_password: str
    new_password: str


class GoogleUser(BaseModel):
    sub: str
    email: str
    name: str


class SamlUser(BaseModel):
    nameid: str
    email: str
    name: Optional[str] = None


@router.post("/token", response_model=TokenResponse)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db),
    otp: Optional[str] = Form(None),
):
    UserModel = models_pool["user"]
    user: UserModel = UserModel.authenticate_user(
        db, form_data.username, form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # verify 2FA
    if user.is_use_2fa:
        totp = pyotp.TOTP(decrypt(user.secret_key_2fa))
        if not totp.verify(otp):
            # check recovery codes if otp is invalid
            recovery_codes = json.loads(user.recovery_codes or "[]")
            code_index = get_valid_recovery_code_index(otp, recovery_codes)
            if code_index == -1:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect OTP",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            else:
                # remove recovery code after using
                recovery_codes.pop(code_index)
                user.recovery_codes = (
                    json.dumps(recovery_codes) if len(recovery_codes) else None
                )
                db.commit()
    else:  # Require the user to configure 2FA if they haven't done so yet, but the organization forces 2FA.
        organization = db.query(OrganizationModel).get(user.organization_id)
        if organization.require_2fa_all_users:
            return {
                "access_token": "",
                "user": None,
                "is_require_user_config_2fa": True,
            }

    access_token_expire_minutes = 60 * 24  # 24 hours
    if user.organization_id:
        organization = db.query(OrganizationModel).get(user.organization_id)
        if organization and organization.access_token_expire_minutes:
            access_token_expire_minutes = organization.access_token_expire_minutes

    access_token_expires = timedelta(minutes=access_token_expire_minutes)
    access_token = jwt.encode(
        {"uid": user.id, "exp": datetime.now(UTC) + access_token_expires},
        APP_SECRET,
        algorithm=AUTH_ALGORITHM,
    )

    permissions = user.get_user_permissions()
    all_roles = (
        user.get_user_roles()
    )  # list of all explicitly assigned roles and implied roles, recursively

    current_user = CurrentUser(
        **UserReadSchema.model_validate(
            user, from_attributes=True
        ).dict(),  # return without password
        permissions=permissions,
        all_roles=all_roles,
    )

    return TokenResponse(
        access_token=access_token, user=current_user, is_require_user_config_2fa=False
    )


def create_access_token(
    user: UserModel,
    db: Optional[Session] = None,
    organization: Optional[OrganizationModel] = None,
) -> str:
    access_token_expire_minutes = 60 * 24  # 24 hours
    if not organization and db:
        if user.organization:
            organization = user.organization
        else:
            organization = (
                db.query(OrganizationModel)
                .filter(OrganizationModel.string_id == "1")
                .first()
            )
    if organization and organization.access_token_expire_minutes:
        access_token_expire_minutes = organization.access_token_expire_minutes

    access_token_expires = timedelta(minutes=access_token_expire_minutes)
    access_token = jwt.encode(
        {"uid": user.id, "exp": datetime.now(UTC) + access_token_expires},
        APP_SECRET,
        algorithm=AUTH_ALGORITHM,
    )
    return access_token


@router.post("/signup", response_model=SignupResponse)
def signup(user_data: UserSignupSubmission, db: Session = Depends(get_db)):
    # Check if the username already exists
    existing_user = (
        db.query(UserModel)
        .filter(
            or_(
                UserModel.username == user_data.email,
                UserModel.email == user_data.email,
            )
        )
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists",
        )

    # Hash the password
    hashed_password = pwd_context.hash(user_data.password)

    if user_data.token:
        decoded_token = jwt.decode(
            user_data.token, APP_SECRET, algorithms=[AUTH_ALGORITHM]
        )
        owner_id = decoded_token["uid"]
        user = db.query(UserModel).get(owner_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
            )

        user.username = user_data.email
        user.email = user_data.email
        user.hashed_password = hashed_password
        user.signed_up = True

    else:
        user = UserModel(
            username=user_data.email,
            email=user_data.email,
            hashed_password=hashed_password,
            organization_id=user_data.organization_id,
            signed_up=True,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # find role "public_role" and assign to user
    org_public_role = (
        db.query(RoleModel)
        .filter_by(string_id="public_role", organization_id=user_data.organization_id)
        .first()
    )

    if org_public_role:
        user.roles.append(org_public_role)
    else:
        default_public_role = (
            db.query(RoleModel)
            .filter_by(string_id="public_role", organization_id=DEFAULT_ORG_ID)
            .first()
        )
        if default_public_role:
            user.roles.append(default_public_role)
        else:
            public_role = db.query(RoleModel).filter_by(string_id="public_role").first()
            if public_role:
                user.roles.append(public_role)

    db.commit()

    return {"success": True, "id": user.id}


@router.post("/init", response_model=InitAnonymousUserResponse)
def create_anonymous_user(init_data: UserInitSubmission, db: Session = Depends(get_db)):
    # find existing user first
    user = (
        db.query(UserModel)
        .filter(UserModel.anonymous_id == init_data.anonymous_id)
        .first()
    )
    if not user:
        # user not found, create new user
        anon_username = f"user-{init_data.anonymous_id}"
        data = {
            "username": anon_username,
            "email": anon_username,
            "anonymous_id": init_data.anonymous_id,
            "hashed_password": pwd_context.hash(str(uuid4())),
        }

        data.update(init_data)
        user = UserModel(**data)

        # find role "public_role" and assign to user
        org_public_role = (
            db.query(RoleModel)
            .filter_by(
                string_id="public_role", organization_id=init_data.organization_id
            )
            .first()
        )

        if org_public_role:
            user.roles.append(org_public_role)
        else:
            default_public_role = (
                db.query(RoleModel)
                .filter_by(string_id="public_role", organization_id=DEFAULT_ORG_ID)
                .first()
            )
            if default_public_role:
                user.roles.append(default_public_role)
            else:
                public_role = (
                    db.query(RoleModel).filter_by(string_id="public_role").first()
                )
                if public_role:
                    user.roles.append(public_role)

        db.add(user)
        db.commit()
        db.refresh(user)

    # create anon token that never expires
    token = jwt.encode(
        {
            "uid": user.id,
            "anon_only": True,
        },
        APP_SECRET,
        algorithm=AUTH_ALGORITHM,
    )

    return {
        "token": token,
        "user": user,
    }


@router.post("/reset-password-request")
async def reset_password_request(
    input: ResetPasswordRequestSubmission, db: Session = Depends(get_db)
):
    # Check if the username/email already exists
    user = (
        db.query(UserModel)
        .filter(
            or_(UserModel.username == input.mixin_id, UserModel.email == input.mixin_id)
        )
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email/username does not exist",
        )
    user_email = user.email
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User email is not configured",
        )

    ok = await user.email_reset_password(db)
    if ok:
        return {"success": True}
    else:
        return {"success": False}


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(input: ResetPasswordSubmission, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(input.token, APP_SECRET, algorithms=[AUTH_ALGORITHM])
        owner_id: str = payload.get("uid")
        if not owner_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials payload",
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    user: UserModel = db.query(UserModel).get(owner_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate user",
        )

    organization: OrganizationModel = user.organization
    if user.temp_secret_key_2fa and (
        organization.require_2fa_all_users or user.is_use_2fa
    ):
        totp = pyotp.TOTP(decrypt(user.temp_secret_key_2fa))
        if not input.crosscheck_otp or not totp.verify(input.crosscheck_otp):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid OTP"
            )
        user.secret_key_2fa = user.temp_secret_key_2fa
        user.temp_secret_key_2fa = None

    user.hashed_password = pwd_context.hash(input.new_password)

    # in case the organization force 2fa leads to reset password, when submit new password => also confirm to use 2fa.
    # and after 2fa enabled, provide user recovery codes for backup
    if input.should_confirm_2fa_when_change_password:
        user.is_use_2fa = True
    # Generate a new recovery codes each time the password is reset.
    recovery_codes = generate_recovery_codes()
    hash_recovery_codes = [hash_text(code) for code in recovery_codes]
    user.recovery_codes = json.dumps(hash_recovery_codes)

    db.commit()

    return {
        "success": True,
        "recovery_codes": recovery_codes if user.is_use_2fa else [],
    }


@router.post("/change-password")
def change_password(
    input: ChangePasswordSubmission,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    print(user.username)
    is_verified = pwd_context.verify(input.old_password, user.hashed_password)
    if not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid password"
        )
    hashed_password = pwd_context.hash(input.new_password)
    user.hashed_password = hashed_password
    db.commit()
    return {"success": True}


class Info2FaDto(BaseModel):
    is_organization_require_2fa: bool = False
    is_already_config_2fa: bool = False
    totp_uri: str = ""


# This API is used to get the QR code URI on the password reset page
@router.post("/check-2fa-config")
def check_2fa_config(
    token: Annotated[str, Body(embed=True)], db: Session = Depends(get_db)
) -> Info2FaDto:
    try:
        payload = jwt.decode(token, APP_SECRET, algorithms=[AUTH_ALGORITHM])
        owner_id: str = payload.get("uid")
        if not owner_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials payload",
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    user: UserModel = db.query(UserModel).get(owner_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate user",
        )

    is_organization_require_2fa = False
    if user.organization_id:
        organization = db.query(OrganizationModel).get(user.organization_id)
        is_organization_require_2fa = organization.require_2fa_all_users

    # If the user hasn't configured 2FA and the organization hasn't forced 2FA, then don't display the QR code
    if not user.is_use_2fa and not is_organization_require_2fa:
        return Info2FaDto(
            is_organization_require_2fa=False, is_already_config_2fa=False, totp_uri=""
        )

    # Generate a new secret_key_2fa each time the password is reset.
    secret_key = pyotp.random_base32()
    user.temp_secret_key_2fa = encrypt(secret_key)
    db.commit()

    totp_uri = pyotp.totp.TOTP(secret_key).provisioning_uri(
        name=user.username, issuer_name=user.organization.name
    )
    return Info2FaDto(
        is_organization_require_2fa=is_organization_require_2fa,
        is_already_config_2fa=user.is_use_2fa,
        totp_uri=totp_uri,
    )


def getOauth(db: Session):
    organization = (
        db.query(OrganizationModel).filter(OrganizationModel.string_id == "1").first()
    )
    if (
        not organization
        or not organization.google_client_id
        or not organization.google_client_secret
        or not organization.google_redirect_uri
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OAuth configuration is missing.",
        )
    config_data = {
        "GOOGLE_CLIENT_ID": organization.google_client_id,
        "GOOGLE_CLIENT_SECRET": organization.google_client_secret,
    }
    starlette_config = Config(environ=config_data)
    oauth = OAuth(starlette_config)
    oauth.register(
        name="google",
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )
    return oauth, organization.google_redirect_uri


@router.get("/login/google")
async def login_google(request: Request, db=Depends(get_db)):
    oauth, redirect_uri = getOauth(db)
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/auth/google")
async def auth_google(request: Request, db: Session = Depends(get_db)):
    try:
        oauth, _ = getOauth(db)
        user_response: OAuth2Token = await oauth.google.authorize_access_token(request)
    except OAuthError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    user_info = user_response.get("userinfo")
    google_user = GoogleUser(**user_info)
    existing_user = (
        db.query(UserModel).filter(UserModel.email == google_user.email).one_or_none()
    )
    if existing_user:
        organization = existing_user.organization
        user = existing_user
        user.google_id = google_user.sub
        db.commit()
    else:
        organization = (
            db.query(OrganizationModel)
            .filter(OrganizationModel.string_id == "1")
            .one_or_none()
        )
        user = UserModel(
            username=google_user.email,
            email=google_user.email,
            name=google_user.name,
            google_id=google_user.sub,
            signed_up=True,
            organization_id=organization.id if organization else 1,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # find role "User" and assign to user
        role = db.query(RoleModel).filter(RoleModel.string_id == "user_role").first()
        if role:
            user.roles.append(role)
            db.commit()

    access_token = create_access_token(user=user, organization=organization)
    return RedirectResponse(
        f"{FRONTEND_URL}/google-authenticated?access_token={access_token}"
    )


def normalize_x509_certificate(cert_content: str) -> str:
    """
    Add BEGIN/END headers to certificate if missing.
    """
    if not cert_content or not cert_content.strip():
        return ""

    cert_clean = cert_content.strip()

    # Check if certificate already has headers
    has_begin = cert_clean.startswith("-----BEGIN CERTIFICATE-----")
    has_end = cert_clean.endswith("-----END CERTIFICATE-----")

    if has_begin and has_end:
        return cert_content

    # Add missing headers
    if not has_begin:
        cert_clean = "-----BEGIN CERTIFICATE-----\n" + cert_clean
    if not has_end:
        cert_clean = cert_clean + "\n-----END CERTIFICATE-----"

    return cert_clean


def getSamlSettings(db: Session, require_idp: bool = True) -> dict:
    organization = (
        db.query(OrganizationModel)
        .filter(OrganizationModel.id == DEFAULT_ORG_ID)
        .first()
    )
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found.",
        )

    # Only require IdP configuration for authentication, not for metadata generation
    if require_idp and (
        not organization.saml_idp_entity_id
        or not organization.saml_idp_sso_url
        or not organization.saml_idp_x509_cert
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SAML IdP configuration is missing.",
        )

    return {
        "sp": {
            "entityId": organization.saml_sp_entity_id
            or f"{BACKEND_URL}/saml/metadata",
            "assertionConsumerService": {
                "url": organization.saml_sp_acs_url or f"{BACKEND_URL}/auth/saml",
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
            },
            "singleLogoutService": {
                "url": organization.saml_sp_sls_url or f"{BACKEND_URL}/sls/saml",
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
            },
            "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified",
            "x509cert": "",
            "privateKey": "",
        },
        "security": {
            "nameIdEncrypted": False,
            "authnRequestsSigned": False,
            "logoutRequestSigned": False,
            "logoutResponseSigned": False,
            "signMetadata": False,
            "wantAssertionsSigned": True,  # Require signed assertions
            "wantNameId": True,
            "wantAssertionsEncrypted": False,
            "wantNameIdEncrypted": False,
            "requestedAuthnContext": False,
            "allowRepeatAttributeName": True,  # Allow duplicate attribute names
            "signatureAlgorithm": "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
            "digestAlgorithm": "http://www.w3.org/2001/04/xmlenc#sha256",
        },
        "idp": {
            "entityId": organization.saml_idp_entity_id or "",
            "singleSignOnService": {
                "url": organization.saml_idp_sso_url or "",
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
            },
            "singleLogoutService": {
                "url": "",
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
            },
            "x509cert": normalize_x509_certificate(
                organization.saml_idp_x509_cert or ""
            ),
        },
    }


def init_saml_auth(req, db: Session):
    settings = getSamlSettings(db)
    auth = OneLogin_Saml2_Auth(req, settings)
    return auth


def prepare_fastapi_request(request: Request):
    url_data = {
        "https": "on" if request.url.scheme == "https" else "off",
        "http_host": request.headers.get("host", ""),
        "server_port": str(
            request.url.port or (443 if request.url.scheme == "https" else 80)
        ),
        "script_name": request.url.path,
        "get_data": dict(request.query_params),
        "post_data": {},  # Will be populated for POST requests
    }
    return url_data


@router.get("/login/saml")
async def login_saml(
    request: Request, db: Session = Depends(get_db), redirect: str = None
):
    try:
        req = prepare_fastapi_request(request)
        auth = init_saml_auth(req, db)

        # Pass redirect parameter as RelayState to preserve it through SAML flow
        sso_url = auth.login(return_to=redirect)
        return RedirectResponse(sso_url)
    except Exception as e:
        logger.error(f"Error initiating SAML login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate SAML authentication",
        )


@router.post("/auth/saml")
async def auth_saml(request: Request, db: Session = Depends(get_db)):
    try:
        form = await request.form()
        req = prepare_fastapi_request(request)
        req["post_data"] = dict(form)

        auth = init_saml_auth(req, db)
        auth.process_response()

        errors = auth.get_errors()

        if len(errors) == 0:
            attrs = auth.get_attributes()
            nameid = auth.get_nameid()

            # Get organization for SAML configuration
            saml_organization = (
                db.query(OrganizationModel)
                .filter(OrganizationModel.string_id == "1")
                .first()
            )

            # Extract user info using attribute mapping
            attr_mapping = saml_organization.saml_attribute_mapping or {}

            email_attr = attr_mapping.get(
                "email",
                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
            )
            name_attr = attr_mapping.get(
                "name", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
            )

            email = (
                attrs.get(email_attr, [nameid])[0] if attrs.get(email_attr) else nameid
            )
            name = attrs.get(name_attr, [""])[0] if attrs.get(name_attr) else ""

            if not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email attribute not found in SAML response",
                )

            saml_user = SamlUser(nameid=nameid, email=email, name=name)

            # Check if user exists - try by email first, then by username if email is not available
            existing_user = None
            if saml_user.email and saml_user.email != saml_user.nameid:
                existing_user = (
                    db.query(UserModel)
                    .filter(UserModel.email == saml_user.email)
                    .one_or_none()
                )

            # If no user found by email, try by username (for cases where email attribute is missing)
            if not existing_user:
                existing_user = (
                    db.query(UserModel)
                    .filter(UserModel.username == saml_user.nameid)
                    .one_or_none()
                )

            if existing_user:
                user = existing_user
                organization = existing_user.organization
                user.saml_nameid = saml_user.nameid
                if saml_user.name and not user.name:
                    user.name = saml_user.name
                db.commit()
            else:
                organization = (
                    saml_organization  # Use the SAML organization for new users
                )
                user = UserModel(
                    username=saml_user.nameid,  # Use SAML NameID as username
                    email=saml_user.email,
                    name=saml_user.name,
                    saml_nameid=saml_user.nameid,
                    signed_up=True,
                    organization_id=organization.id if organization else 1,
                )
                db.add(user)
                db.commit()
                db.refresh(user)

                # find role "user_role" and assign to new SAML user
                role = (
                    db.query(RoleModel)
                    .filter(RoleModel.string_id == "user_role")
                    .first()
                )
                if role:
                    user.roles.append(role)
                    db.commit()

            access_token = create_access_token(user=user, organization=organization)

            # Get RelayState (redirect parameter) from SAML response
            relay_state = req["post_data"].get("RelayState")

            if relay_state:
                # Redirect to the original intended URL
                return RedirectResponse(
                    f"{FRONTEND_URL}/admin/saml-authenticated?access_token={access_token}&redirect={relay_state}"
                )
            else:
                # Default redirect
                return RedirectResponse(
                    f"{FRONTEND_URL}/admin/saml-authenticated?access_token={access_token}"
                )
        else:
            logger.error(f"SAML authentication errors: {errors}")
            logger.error(f"SAML last error reason: {auth.get_last_error_reason()}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"SAML authentication failed: {', '.join(errors)}",
            )
    except Exception as e:
        logger.error(f"SAML authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="SAML authentication failed",
        )


@router.get("/saml/metadata")
async def saml_metadata(db: Session = Depends(get_db)):
    try:
        # Don't require IdP configuration for metadata generation
        settings_dict = getSamlSettings(db, require_idp=False)
        settings = OneLogin_Saml2_Settings(settings_dict)
        metadata = settings.get_sp_metadata()

        # Basic validation - just check if metadata was generated
        if metadata:
            logger.info("SAML metadata generated successfully")
            return Response(
                content=metadata,
                media_type="application/xml",
                headers={"Content-Disposition": "attachment; filename=metadata.xml"},
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate SAML metadata - empty result",
            )
    except Exception as e:
        logger.error(f"Error generating SAML metadata: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate SAML metadata",
        )

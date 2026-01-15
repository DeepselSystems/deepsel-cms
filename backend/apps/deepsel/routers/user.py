import json
import logging
from typing import Annotated, Any, List, Optional
import pyotp
from fastapi import BackgroundTasks, Body, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from apps.deepsel.utils import decrypt, encrypt, generate_recovery_codes, hash_text
from apps.deepsel.utils.crud_router import CALLABLE, CRUDRouter
from apps.deepsel.utils.generate_crud_schemas import (
    generate_CRUD_schemas,
    generate_read_schema,
)
from apps.deepsel.utils.get_current_user import get_current_user
from apps.deepsel.utils.models_pool import models_pool

logger = logging.getLogger(__name__)

table_name = "user"
CRUDSchemas = generate_CRUD_schemas(table_name)
Model = models_pool[table_name]
RoleModel = models_pool["role"]
EmailTemplateModel = models_pool["email_template"]
OrganizationModel = models_pool["organization"]
RoleReadSchema = generate_read_schema(RoleModel)


class UserCustomRouter(CRUDRouter):
    def _create(self, *args: Any, **kwargs: Any) -> CALLABLE:
        def route(
            model: self.create_schema,  # type: ignore
            background_tasks: BackgroundTasks,
            db: Session = Depends(self.db_func),
            user: Model = Depends(get_current_user),
        ) -> [Model]:
            values = model.dict()
            # check if username already exists, including lowercase
            if db.query(Model).filter(Model.username.ilike(values["username"])).first():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username already exists",
                )

            new_user = self.db_model.create(db, user, model.dict())

            # send password setup email to new user
            background_tasks.add_task(new_user.send_set_password_email, db)

            return new_user

        return route


router = UserCustomRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
)


class CurrentUser(CRUDSchemas.Read):
    permissions: Optional[List[str]]
    all_roles: Optional[List[RoleReadSchema]]


@router.get("/util/me", response_model=CurrentUser)
def get_me(user: Model = Depends(get_current_user)):
    permissions = user.get_user_permissions()
    all_roles = (
        user.get_user_roles()
    )  # list of all explicitly assigned roles and implied roles, recursively

    current_user = CurrentUser(
        **CRUDSchemas.Read.model_validate(user).model_dump(),  # return without password
        permissions=permissions,
        all_roles=all_roles,
    )
    return current_user


class Info2Fa(BaseModel):
    is_use_2fa: bool = False
    totp_uri: str = ""
    recovery_codes: list[str] = []


@router.put("/me/2fa-config")
def update_2fa_config(
    is_use_2fa: Annotated[bool, Body(embed=True)],
    confirmed: Annotated[bool, Body(embed=True)] = False,
    crosscheck_otp: Annotated[str, Body(embed=True)] = None,
    user: Model = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Info2Fa:
    if confirmed:
        # cross check otp to make sure user already scan qr code
        totp = pyotp.TOTP(decrypt(user.secret_key_2fa))
        if not totp.verify(crosscheck_otp):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid OTP"
            )

        recovery_codes = []
        # in case confirm using 2fa. secret_key already generated before. no need to create secret_key again.
        if is_use_2fa:
            if not user.secret_key_2fa:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="secret_key_2fa not found",
                )
            user.is_use_2fa = True
            # also generate recovery code for backup
            if not user.recovery_codes:
                recovery_codes = generate_recovery_codes()
                hashed_recovery_codes = [hash_text(code) for code in recovery_codes]
                user.recovery_codes = json.dumps(hashed_recovery_codes)
        else:
            user.is_use_2fa = False
            user.secret_key_2fa = None
            user.recovery_codes = None
        db.commit()

        return Info2Fa(
            is_use_2fa=is_use_2fa, recovery_codes=recovery_codes if is_use_2fa else []
        )

    # if not confirmed => only get secret_key (create if not exist) for showing QR
    if not user.secret_key_2fa:
        secret_key = pyotp.random_base32()
        user.secret_key_2fa = encrypt(secret_key)
        db.commit()
    totp_uri = pyotp.totp.TOTP(decrypt(user.secret_key_2fa)).provisioning_uri(
        name=user.username, issuer_name=user.organization.name
    )
    return Info2Fa(totp_uri=totp_uri)


@router.get("/me/2fa-config")
def get_2fa_uri(
    user: Model = Depends(get_current_user),
) -> Info2Fa:
    if user.is_use_2fa:
        totp_uri = pyotp.totp.TOTP(decrypt(user.secret_key_2fa)).provisioning_uri(
            name=user.username, issuer_name=user.organization.name
        )
        return Info2Fa(is_use_2fa=user.is_use_2fa, totp_uri=totp_uri)
    return Info2Fa()

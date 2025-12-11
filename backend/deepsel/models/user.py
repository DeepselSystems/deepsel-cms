import json
from sqlalchemy import JSON, Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship, Session
from sqlalchemy.types import UUID
from fastapi import HTTPException, status
from db import Base
from deepsel.mixins.address import AddressMixin
from deepsel.mixins.orm import ORMBaseMixin
from deepsel.mixins.profile import ProfileMixin
from deepsel.utils.models_pool import models_pool
from constants import AUTH_ALGORITHM, APP_SECRET, FRONTEND_URL, AUTHLESS, DEFAULT_ORG_ID
import jwt
import logging
from datetime import datetime, timedelta, UTC
from deepsel.utils.pwd_context import pwd_context

logger = logging.getLogger(__name__)


class UserModel(Base, ORMBaseMixin, AddressMixin, ProfileMixin):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True)
    string_id = Column(String, unique=True)

    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String)
    signed_up = Column(Boolean, default=False)
    internal = Column(Boolean, default=False, nullable=False)
    device_info = Column(JSON)
    company_name = Column(String)

    roles = relationship("RoleModel", secondary="user_role")
    organization_id = Column(Integer, ForeignKey("organization.id"), nullable=True)
    organization = relationship("OrganizationModel")
    organizations = relationship(
        "OrganizationModel", secondary="user_organization", enable_typechecks=False
    )
    image_id = Column(Integer, ForeignKey("attachment.id"))
    image = relationship("AttachmentModel", foreign_keys=[image_id])
    cv_attachment_id = Column(Integer, ForeignKey("attachment.id"))
    cv = relationship("AttachmentModel", foreign_keys=[cv_attachment_id])

    is_use_2fa = Column(Boolean, default=False)
    secret_key_2fa = Column(String)
    temp_secret_key_2fa = Column(String)
    recovery_codes = Column(JSON, nullable=True)

    google_id = Column(String)
    saml_nameid = Column(String)
    anonymous_id = Column(UUID(as_uuid=True))
    preferences = Column(JSON, default={})

    def get_org_ids(self):
        org_ids = [org.id for org in self.organizations]
        if self.organization_id:
            org_ids.append(self.organization_id)
        return org_ids

    def check_and_raise_if_not_admin_or_super_admin(self):
        if not any(
            role.string_id in ["admin_role", "super_admin_role", "website_admin_role"]
            for role in self.roles
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin or super admin can update user",
            )

    def is_public_user(self):
        return not self.signed_up or self.string_id == "public_user"

    def is_admin(self):
        roles = self.get_user_roles()
        return any(
            [role.string_id in ["admin_role", "super_admin_role"] for role in roles]
        )

    def _get_roles_recursively(self, role, processed_roles: list = None) -> set:
        # Avoid circular references
        if processed_roles is None:
            processed_roles = set()

        if role in processed_roles:
            return set()

        processed_roles.add(role)

        roles = set()
        roles.add(role)

        for implied_role in role.implied_roles:
            roles.update(self._get_roles_recursively(implied_role, processed_roles))

        return roles

    def _get_permissions_recursively(
        self, role, processed_roles: list = None
    ) -> set[str]:
        # Avoid circular references
        if processed_roles is None:
            processed_roles = set()

        if role in processed_roles:
            return set()

        processed_roles.add(role)

        permissions = set()
        if role.permissions:
            these_permissions = json.loads(role.permissions)
            for permission in these_permissions:
                permissions.add(permission)

        for implied_role in role.implied_roles:
            permissions.update(
                self._get_permissions_recursively(implied_role, processed_roles)
            )

        return permissions

    def get_user_permissions(self, user: "UserModel" = None) -> list[str]:
        user = user or self
        roles = user.roles
        permissions = set()  # Avoid duplicates

        for role in roles:
            permissions.update(self._get_permissions_recursively(role))

        return list(permissions)

    def get_user_roles(self, user: "UserModel" = None) -> list:
        user = user or self
        roles = user.roles
        all_roles = set()

        for role in roles:
            all_roles.update(self._get_roles_recursively(role))

        return list(all_roles)

    @classmethod
    def get_user_has_roles(cls, role_string_ids: list[str], db: Session):
        ImpliedRoleModel = models_pool["implied_role"]
        UserRoleModel = models_pool["user_role"]
        RoleModel = models_pool["role"]

        roles = (
            db.query(RoleModel).filter(RoleModel.string_id.in_(role_string_ids)).all()
        )
        role_ids = [role.id for role in roles]
        # also check main role that implied the checking roles
        main_roles = (
            db.query(ImpliedRoleModel)
            .filter(ImpliedRoleModel.implied_role_id.in_(role_ids))
            .all()
        )
        role_ids += [role.role_id for role in main_roles]
        users = (
            db.query(cls)
            .join(UserRoleModel)
            .filter(UserRoleModel.role_id.in_(list(set(role_ids))))
        ).all()
        return users

    async def send_set_password_email(self, db: Session):
        EmailTemplateModel = models_pool["email_template"]
        OrganizationModel = models_pool["organization"]
        org = db.query(OrganizationModel).get(self.organization_id)
        token = jwt.encode({"uid": self.id}, APP_SECRET, algorithm=AUTH_ALGORITHM)
        context = {
            "name": self.name or self.username,
            "username": self.username,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "action_url": FRONTEND_URL + "?t=" + token,
            "business_name": org.name,
        }

        template = (
            db.query(EmailTemplateModel)
            .filter_by(string_id="setup_password_template")
            .first()
        )
        ok = await template.send(db, [self.email], context)
        if not ok:
            logger.error(f"Failed to send password setup email to {self.email}")
        else:
            logger.info(f"Password setup email sent to {self.email}")
        return ok

    async def email_reset_password(self, db: Session):
        token = jwt.encode(
            {
                "uid": self.id,
                "exp": datetime.now(UTC) + timedelta(hours=24),
            },
            APP_SECRET,
            algorithm=AUTH_ALGORITHM,
        )

        context = {
            "name": self.name or self.username,
            "username": self.username,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "action_url": FRONTEND_URL + "/reset-password" + "?t=" + token,
            "business_name": self.organization.name,
        }

        EmailTemplateModel = models_pool["email_template"]
        template = (
            db.query(EmailTemplateModel)
            .filter_by(string_id="reset_password_template")
            .first()
        )
        ok = await template.send(db, [self.email], context)
        return ok

    @staticmethod
    def authenticate_user(db: Session, username: str, password: str):
        UserModel = models_pool["user"]
        OrgModel = models_pool["organization"]
        org = db.query(OrgModel).get(DEFAULT_ORG_ID)
        if AUTHLESS and org and not org.enable_auth:
            # In authless mode, return admin user
            user = (
                db.query(UserModel)
                .filter_by(
                    string_id="admin_user",
                )
                .first()
            )
            return user
        user = (
            db.query(UserModel)
            .filter(UserModel.username == username)
            .filter(UserModel.active == True)
            .first()
        )
        if not user:
            return False
        if not pwd_context.verify(password, user.hashed_password):
            return False
        return user

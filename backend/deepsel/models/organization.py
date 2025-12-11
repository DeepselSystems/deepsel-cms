from typing import Optional

from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from fastapi import HTTPException
from db import Base
from deepsel.mixins.address import AddressMixin
from deepsel.mixins.orm import ORMBaseMixin
from sqlalchemy.orm import Session
from constants import DEFAULT_ORG_ID, AUTHLESS


class OrganizationModel(Base, ORMBaseMixin, AddressMixin):
    __tablename__ = "organization"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    image_attachment_id = Column(Integer, ForeignKey("attachment.id"))
    image = relationship("AttachmentModel", foreign_keys=[image_attachment_id])

    # internal settings
    mail_username = Column(String)
    mail_password = Column(String)
    mail_timeout = Column(Integer, default=60)
    mail_from = Column(String)
    mail_port = Column(String)
    mail_server = Column(String)
    mail_from_name = Column(String)
    mail_validate_certs = Column(Boolean, nullable=False, default=False)
    mail_use_credentials = Column(Boolean, nullable=False, default=True)
    mail_ssl_tls = Column(Boolean, nullable=False, default=False)
    mail_starttls = Column(Boolean, nullable=False, default=False)
    mail_send_rate_limit_per_hour = Column(Integer, default=200)

    # public settings
    access_token_expire_minutes = Column(Integer, default=1440)
    require_2fa_all_users = Column(Boolean, default=False)
    allow_public_signup = Column(Boolean, default=True)

    enable_auth = Column(Boolean, default=False)

    # google sign in
    is_enabled_google_sign_in = Column(Boolean, default=False)
    google_client_id = Column(String)
    google_client_secret = Column(String)
    google_redirect_uri = Column(String)

    # SAML configuration
    is_enabled_saml = Column(Boolean, default=False)
    saml_idp_entity_id = Column(String)
    saml_idp_sso_url = Column(String)
    saml_idp_x509_cert = Column(String)
    saml_sp_entity_id = Column(String)
    saml_sp_acs_url = Column(String)
    saml_sp_sls_url = Column(String)
    saml_attribute_mapping = Column(
        JSON,
        default=lambda: {
            "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
            "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        },
    )

    current_version = Column(String)

    @classmethod
    def get_public_settings(cls, organization_id: int, db: Session):
        organization = db.query(cls).get(organization_id)
        default_org = db.query(cls).get(DEFAULT_ORG_ID)
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")

        return {
            "id": organization.id,
            "name": organization.name,
            "access_token_expire_minutes": organization.access_token_expire_minutes,
            "require_2fa_all_users": organization.require_2fa_all_users,
            "allow_public_signup": organization.allow_public_signup,
            "is_enabled_google_sign_in": organization.is_enabled_google_sign_in,
            "is_enabled_saml": organization.is_enabled_saml,
            "saml_sp_entity_id": organization.saml_sp_entity_id,
            "authless": not default_org.enable_auth and AUTHLESS,
        }

    # dont let anyone other than admin and super_admin roles to get settings
    @classmethod
    def get_one(
        cls, db: Session, user, item_id: int, *args, **kwargs
    ) -> "OrganizationModel":
        org = super().get_one(db, user, item_id, *args, **kwargs)
        user_roles = user.get_user_roles()
        is_admin = any(
            [
                role.string_id
                in ["admin_role", "super_admin_role", "website_admin_role"]
                for role in user_roles
            ]
        )

        if is_admin:
            return org
        else:
            return org.get_public_settings(org.id, db)

    def update(
        self,
        db: Session,
        user,
        values: dict,
        commit: Optional[bool] = True,
        *args,
        **kwargs,
    ):
        """
        Update OrganizationModel while preserving existing secret values.

        If a secret values is not provided in the values dict, the existing value
        from the organization will be retained to prevent accidental key deletion.
        """
        # Get updating organization
        organization = db.query(OrganizationModel).get(self.id)

        # Check if secret values is not existed in api payload then keeps existing values
        api_keys = [
            "openrouter_api_key",
        ]

        for key in api_keys:
            if not values.get(key):
                values[key] = getattr(organization, key)

        return super().update(db, user, values, commit, *args, **kwargs)

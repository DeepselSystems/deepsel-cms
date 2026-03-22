from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from db import Base
from apps.core.mixins.orm import ORMBaseMixin
from deepsel.orm.organization_mixin import OrganizationMixin


class OrganizationModel(Base, OrganizationMixin, ORMBaseMixin):
    __tablename__ = "organization"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    # address fields
    street = Column(String)
    street2 = Column(String)
    city = Column(String)
    state = Column(String)
    zip = Column(String)
    country = Column(String)

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

    # --- OrganizationMixin settings ---

    @classmethod
    def _get_default_org_id(cls):
        from settings import DEFAULT_ORG_ID

        return DEFAULT_ORG_ID

    @classmethod
    def _get_is_authless(cls):
        from settings import AUTHLESS

        return AUTHLESS

    @classmethod
    def _get_public_settings_fields(cls):
        return [
            "id",
            "name",
            "access_token_expire_minutes",
            "require_2fa_all_users",
            "allow_public_signup",
            "is_enabled_google_sign_in",
            "is_enabled_saml",
            "saml_sp_entity_id",
        ]

    @classmethod
    def _get_protected_api_key_fields(cls):
        return ["openrouter_api_key"]

    @classmethod
    def _get_admin_role_string_ids(cls):
        return ["admin_role", "super_admin_role", "website_admin_role"]

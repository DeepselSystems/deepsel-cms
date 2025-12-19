from apps.cms.types.shared_datatypes import CMSSettingsEncryptedDataReadSSchema
from deepsel.utils.crud_router import CRUDRouter
from deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from deepsel.utils.get_current_user import get_current_user
from fastapi import Depends
from typing import Optional
from pydantic import BaseModel, ConfigDict

table_name = "organization"
CRUDSchemas = generate_CRUD_schemas(table_name)


class LocaleSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    name: Optional[str] = None
    iso_code: Optional[str] = None
    emoji_flag: Optional[str] = None


class ReadSchema(CRUDSchemas.Read, CMSSettingsEncryptedDataReadSSchema):
    # internal settings values may be null for non-admin users
    mail_username: Optional[str] = None
    mail_password: Optional[str] = None
    mail_from: Optional[str] = None
    mail_port: Optional[str] = None
    mail_server: Optional[str] = None
    mail_from_name: Optional[str] = None
    mail_validate_certs: Optional[bool] = None
    mail_use_credentials: Optional[bool] = None
    mail_ssl_tls: Optional[bool] = None
    mail_starttls: Optional[bool] = None
    mail_send_rate_limit_per_hour: Optional[int] = None

    # CMS fields with proper serialization
    default_language: Optional[LocaleSchema] = None


class CreateSchema(CRUDSchemas.Create):
    mail_username: Optional[str] = None
    mail_password: Optional[str] = None
    mail_from: Optional[str] = None
    mail_port: Optional[str] = None
    mail_server: Optional[str] = None
    mail_from_name: Optional[str] = None
    mail_validate_certs: Optional[bool] = None
    mail_use_credentials: Optional[bool] = None
    mail_ssl_tls: Optional[bool] = None
    mail_starttls: Optional[bool] = None
    mail_send_rate_limit_per_hour: Optional[int] = None


router = CRUDRouter(
    read_schema=ReadSchema,
    search_schema=CRUDSchemas.Search,
    create_schema=CreateSchema,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
    export_route=False,
    import_route=False,
)

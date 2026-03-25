from typing import List, Optional

from pydantic import BaseModel

from deepsel.utils.generate_crud_schemas import (
    generate_CRUD_schemas,
    generate_read_schema,
)
from apps.core.utils.models_pool import models_pool

RoleModel = models_pool["role"]
RoleReadSchema = generate_read_schema(RoleModel)
CRUDSchemas = generate_CRUD_schemas("user")


class CurrentUser(CRUDSchemas.Read):
    permissions: Optional[List[str]]
    all_roles: Optional[List[RoleReadSchema]]


class Info2Fa(BaseModel):
    is_use_2fa: bool = False
    totp_uri: str = ""
    recovery_codes: list[str] = []

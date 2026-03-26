from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from apps.cms.schemas.template_content import (
    TemplateContentCreateNested,
    TemplateContentRead,
)


class TemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_404: Optional[bool] = False
    is_login: Optional[bool] = False
    contents: list[TemplateContentRead] = []
    organization_id: Optional[int] = None
    owner_id: Optional[int] = None
    string_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    active: Optional[bool] = True
    system: Optional[bool] = False


class TemplateCreate(BaseModel):
    name: str
    is_404: Optional[bool] = False
    is_login: Optional[bool] = False
    contents: Optional[list[TemplateContentCreateNested]] = []
    organization_id: Optional[int] = None


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    is_404: Optional[bool] = None
    is_login: Optional[bool] = None
    contents: Optional[list[TemplateContentCreateNested]] = None
    string_id: Optional[str] = None
    active: Optional[bool] = None
    system: Optional[bool] = None


class TemplateSearch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int
    data: list[TemplateRead]

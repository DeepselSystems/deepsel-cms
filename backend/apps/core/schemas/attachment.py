from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: Optional[str] = None
    content_type: Optional[str] = None
    filesize: Optional[int] = None
    alt_text: Optional[str] = None
    organization_id: Optional[int] = None
    owner_id: Optional[int] = None
    string_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    active: Optional[bool] = True
    system: Optional[bool] = False


class AttachmentUpdate(BaseModel):
    alt_text: Optional[str] = None
    string_id: Optional[str] = None
    active: Optional[bool] = None


class AttachmentSearch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int
    data: list[AttachmentRead]


class UploadSizeLimitResponse(BaseModel):
    value: float
    unit: str


class StorageInfoResponse(BaseModel):
    used_storage: float  # in MB
    max_storage: float | None  # in MB, None means unlimited
    unit: str

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict

from ._nested import (
    AttachmentNested,
    LocaleNested,
    PageContentRevisionNested,
    UserNested,
)


class PageContentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: Optional[str] = None
    slug: Optional[str] = None
    locale_id: Optional[int] = None
    locale: Optional[LocaleNested] = None
    page_id: Optional[int] = None
    seo_metadata_title: Optional[str] = None
    seo_metadata_description: Optional[str] = None
    seo_metadata_featured_image_id: Optional[int] = None
    seo_metadata_featured_image: Optional[AttachmentNested] = None
    seo_metadata_allow_indexing: Optional[bool] = True
    custom_code: Optional[str] = None
    last_modified_at: Optional[datetime] = None
    updated_by_id: Optional[int] = None
    updated_by: Optional[UserNested] = None
    revisions: list[PageContentRevisionNested] = []
    organization_id: Optional[int] = None
    owner_id: Optional[int] = None
    string_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    active: Optional[bool] = True
    system: Optional[bool] = False


class PageContentCreate(BaseModel):
    title: str
    content: Optional[str] = None
    slug: Optional[str] = None
    locale_id: int
    page_id: Optional[int] = None
    seo_metadata_title: Optional[str] = None
    seo_metadata_description: Optional[str] = None
    seo_metadata_featured_image_id: Optional[int] = None
    seo_metadata_allow_indexing: Optional[bool] = True
    custom_code: Optional[str] = None
    organization_id: Optional[int] = None


class PageContentCreateNested(BaseModel):
    id: Optional[int] = None
    title: str
    content: Optional[str] = None
    slug: Optional[str] = None
    locale_id: int
    seo_metadata_title: Optional[str] = None
    seo_metadata_description: Optional[str] = None
    seo_metadata_featured_image_id: Optional[int] = None
    seo_metadata_allow_indexing: Optional[bool] = True
    custom_code: Optional[str] = None
    organization_id: Optional[int] = None


class PageContentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    slug: Optional[str] = None
    locale_id: Optional[int] = None
    seo_metadata_title: Optional[str] = None
    seo_metadata_description: Optional[str] = None
    seo_metadata_featured_image_id: Optional[int] = None
    seo_metadata_allow_indexing: Optional[bool] = None
    custom_code: Optional[str] = None
    last_modified_at: Optional[datetime] = None
    updated_by_id: Optional[int] = None
    string_id: Optional[str] = None
    active: Optional[bool] = None
    system: Optional[bool] = None


class PageContentSearch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int
    data: list[PageContentRead]

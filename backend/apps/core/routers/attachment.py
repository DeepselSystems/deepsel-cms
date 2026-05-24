import json
import os
import uuid

from fastapi import Depends, File, Form, Response, UploadFile, status, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from settings import UPLOAD_SIZE_LIMIT
from db import get_db
from deepsel.utils.crud_router import CRUDRouter
from apps.core.utils.get_current_user import (
    get_current_user,
)
from apps.core.utils.models_pool import models_pool
from apps.core.utils.attachment import (
    find_attachment_usages,
    upsert_locale_versions,
    resolve_unique_attachment_name,
)
from apps.core.schemas.attachment import (
    AttachmentVersionUpsertItem,
    AttachmentRead,
    AttachmentUpdate,
    AttachmentSearch,
    AttachmentUsagesResponse,
    BatchUpsertResponse,
    UploadSizeLimitResponse,
    StorageInfoResponse,
)

table_name = "attachment"
Model = models_pool[table_name]


UserModel = models_pool["user"]
AttachmentLocaleVersionModel = models_pool["attachment_locale_version"]
OrganizationModel = models_pool["organization"]
LocaleModel = models_pool["locale"]

router = CRUDRouter(
    read_schema=AttachmentRead,
    search_schema=AttachmentSearch,
    update_schema=AttachmentUpdate,
    table_name=table_name,
    create_route=False,
)


@router.get("/config/upload_size_limit", response_model=UploadSizeLimitResponse)
def get_upload_size_limit():
    return UploadSizeLimitResponse(value=UPLOAD_SIZE_LIMIT, unit="MB")


@router.get("/storage/info", response_model=StorageInfoResponse)
def get_storage_info(db: Session = Depends(get_db)):
    info = AttachmentLocaleVersionModel.check_storage_quota(db)
    return StorageInfoResponse(
        used_storage=info["used_mb"], max_storage=info["max_mb"], unit="MB"
    )


@router.post("", response_model=list[AttachmentRead])
@router.post("/", response_model=list[AttachmentRead])
def upload_files(
    files: list[UploadFile] = File(...),
    alt_text: str = None,
    locale_id: int = None,  # Optional; falls back to org default locale when omitted
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Calculate total size of new files for quota check
    total_new_bytes = 0
    for file in files:
        file.file.seek(0, os.SEEK_END)
        total_new_bytes += file.file.tell()
        file.file.seek(0)

    AttachmentLocaleVersionModel.check_storage_quota(db, total_new_bytes)

    # Get current organization ID from user
    current_organization_id = getattr(user, "current_organization_id", None)

    # Use caller-supplied locale_id when provided; fall back to org default language
    org = (
        db.query(OrganizationModel)
        .filter(OrganizationModel.id == current_organization_id)
        .first()
        if current_organization_id
        else None
    )
    effective_locale_id = locale_id or getattr(org, "default_language_id", None)

    instances = []
    for file in files:
        kwargs = {}
        if alt_text:
            kwargs["alt_text"] = alt_text

        attachment_name = resolve_unique_attachment_name(
            str(uuid.uuid4()).split("-")[0], db
        )
        instance = Model().create(
            db=db,
            user=user,
            organization_id=current_organization_id,
            name=attachment_name,
            **kwargs,
        )

        # Create a locale version for the effective language automatically on upload.
        if effective_locale_id:
            file.file.seek(0)
            AttachmentLocaleVersionModel().create(
                db=db,
                user=user,
                file=file,
                attachment_id=instance.id,
                locale_id=effective_locale_id,
                **kwargs,
            )

        # Refresh so locale_versions relationship is populated in the response.
        db.refresh(instance)
        instances.append(instance)
    return instances


@router.post(
    "/{attachment_id}/locale_versions/batch_upsert", response_model=BatchUpsertResponse
)
def batch_upsert_locale_versions(
    attachment_id: int,
    items_json: str = Form(
        ..., description="JSON-encoded list of AttachmentVersionUpsertItem"
    ),
    files: list[UploadFile] = File(
        default=[], description="Files matched to items by list index"
    ),
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Batch create-or-update locale versions for a single attachment.

    - attachment_id: path param — the parent attachment (required)
    - items_json: JSON string representing list[AttachmentVersionUpsertItem]
    - files: multipart files matched to items by index (only items that carry a file
      need a corresponding entry; items without file updates are skipped in the files list)

    attachment_locale_version_id=None  →  create new version (file required)
    attachment_locale_version_id=<id>  →  update existing version (file optional)
    """
    raw = json.loads(items_json)
    items = [AttachmentVersionUpsertItem(**item) for item in raw]

    # Build file map: filename without extension → UploadFile
    file_map: dict[str, UploadFile] = {
        os.path.splitext(f.filename)[0]: f for f in files
    }

    # Map each item to its file and validate _file_id references
    item_file_map: dict[int, UploadFile] = {}
    for idx, item in enumerate(items):
        if item.file_id is not None:
            if item.file_id not in file_map:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Item at index {idx}: file with _file_id '{item.file_id}' not found in uploaded files",
                )
            item_file_map[idx] = file_map[item.file_id]

    # Get current organization ID from user
    current_organization_id = getattr(user, "current_organization_id", None)

    # Validate attachment exists and belongs to this organization
    attachment = (
        db.query(Model)
        .filter(
            Model.id == attachment_id,
            Model.organization_id == current_organization_id,
        )
        .first()
    )
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found"
        )

    # Validate no duplicate locale_id within the batch
    locale_ids = [item.locale_id for item in items]
    duplicate_locale_ids = {lid for lid in locale_ids if locale_ids.count(lid) > 1}
    if duplicate_locale_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Duplicate locale_id(s) in batch: {sorted(duplicate_locale_ids)}",
        )

    # Validate each item's locale_id and, when provided, attachment_locale_version_id
    for item in items:
        locale = db.query(LocaleModel).filter(LocaleModel.id == item.locale_id).first()
        if not locale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Locale {item.locale_id} not found",
            )

        if item.attachment_locale_version_id is not None:
            version = (
                db.query(AttachmentLocaleVersionModel)
                .filter(
                    AttachmentLocaleVersionModel.id
                    == item.attachment_locale_version_id,
                    AttachmentLocaleVersionModel.attachment_id == attachment_id,
                )
                .first()
            )
            if not version:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=(
                        f"Locale version {item.attachment_locale_version_id} not found "
                        f"or does not belong to attachment {attachment_id}"
                    ),
                )

    # Quota check for all incoming files before touching the DB
    total_new_bytes = 0
    for f in files:
        f.file.seek(0, os.SEEK_END)
        total_new_bytes += f.file.tell()
        f.file.seek(0)
    AttachmentLocaleVersionModel.check_storage_quota(db, total_new_bytes)

    # Apply batch locale-version updates and inserts for a single attachment.
    results = upsert_locale_versions(
        attachment_id=attachment_id,
        items=items,
        item_file_map=item_file_map,
        db=db,
        user=user,
    )

    db.refresh(attachment)
    return BatchUpsertResponse(
        attachment=attachment,
        results=results,
        has_errors=any(not r.success for r in results),
    )


@router.get("/serve/{file_name}")
def serve_file(
    file_name: str,
    db: Session = Depends(get_db),
):
    instance = AttachmentLocaleVersionModel.get_by_name(db, file_name)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    result = instance.get_serve_result()
    if result.redirect_url:
        return RedirectResponse(url=result.redirect_url, status_code=302)
    return Response(content=result.content, media_type=result.content_type)


@router.get("/serve-by-name/{attachment_name:path}")
def serve_file_by_attachment_name(
    attachment_name: str,
    locale: str = None,
    db: Session = Depends(get_db),
):
    """
    Serve an attachment file by AttachmentModel.name with optional locale resolution.

    Resolves the locale version in this order:
    1. The requested locale (ISO code, e.g. "en", "fr")
    2. The organization's default locale
    3. The first available locale version
    """
    attachment = db.query(Model).filter(Model.name == attachment_name).first()
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found"
        )

    locale_versions = attachment.locale_versions or []
    if not locale_versions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No locale versions available for this attachment",
        )

    resolved_version = None

    if locale:
        locale_record = (
            db.query(LocaleModel).filter(LocaleModel.iso_code == locale).first()
        )
        if locale_record:
            resolved_version = next(
                (v for v in locale_versions if v.locale_id == locale_record.id), None
            )

    if not resolved_version:
        org_settings = db.query(CMSSettingsModel).get(attachment.organization_id)
        default_locale_id = org_settings.default_language_id if org_settings else None
        if default_locale_id:
            resolved_version = next(
                (v for v in locale_versions if v.locale_id == default_locale_id), None
            )

    if not resolved_version:
        resolved_version = locale_versions[0]

    result = resolved_version.get_serve_result()
    if result.redirect_url:
        return RedirectResponse(url=result.redirect_url, status_code=302)
    return Response(content=result.content, media_type=result.content_type)


@router.get("/unused/list", response_model=AttachmentSearch)
def get_unused_attachments(
    page: int = 1,
    page_size: int = 20,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return attachments not referenced by any content — checks Jinja attachment()
    calls and FK image columns (featured_image_id, seo_metadata_featured_image_id).
    Paginated; uses the same AttachmentSearch shape as the standard list endpoint.
    """
    from apps.cms.models.page_content import PageContentModel
    from apps.cms.models.blog_post_content import BlogPostContentModel
    from apps.cms.models.template_content import TemplateContentModel

    current_organization_id = getattr(user, "current_organization_id", None)

    all_attachments = (
        db.query(Model).filter(Model.organization_id == current_organization_id).all()
    )

    unused = []
    for attachment in all_attachments:
        aid = attachment.id
        name = attachment.name

        if not name:
            unused.append(attachment)
            continue

        # 1. Jinja attachment() calls in content text (single-image and gallery).
        pattern = f"%attachment(%%'{name}'%"
        found = (
            db.query(PageContentModel)
            .filter(PageContentModel.content.like(pattern))
            .first()
            or db.query(BlogPostContentModel)
            .filter(BlogPostContentModel.content.like(pattern))
            .first()
            or db.query(TemplateContentModel)
            .filter(TemplateContentModel.content.like(pattern))
            .first()
        )

        # 2. FK image columns in blog_post_content.
        if not found:
            from sqlalchemy import or_

            found = (
                db.query(BlogPostContentModel)
                .filter(
                    or_(
                        BlogPostContentModel.featured_image_id == aid,
                        BlogPostContentModel.draft_featured_image_id == aid,
                        BlogPostContentModel.seo_metadata_featured_image_id == aid,
                        BlogPostContentModel.draft_seo_metadata_featured_image_id
                        == aid,
                    )
                )
                .first()
            )

        # 3. FK SEO image columns in page_content.
        if not found:
            found = (
                db.query(PageContentModel)
                .filter(
                    or_(
                        PageContentModel.seo_metadata_featured_image_id == aid,
                        PageContentModel.draft_seo_metadata_featured_image_id == aid,
                    )
                )
                .first()
            )

        if not found:
            unused.append(attachment)

    total = len(unused)
    offset = (page - 1) * page_size
    page_data = unused[offset : offset + page_size]
    return AttachmentSearch(total=total, data=page_data)


@router.get("/{attachment_id}/usages", response_model=AttachmentUsagesResponse)
def get_attachment_usages(
    attachment_id: int,
    locale_id: int = None,
    db: Session = Depends(get_db),
):
    """
    Return all content records that reference this attachment — via
    {{ attachment(...) }} Jinja calls or FK image columns (featured_image_id,
    seo_metadata_featured_image_id in blog_post_content and page_content).

    Optional query param locale_id narrows results to a single locale.
    """

    attachment = (
        db.query(Model)
        .filter(
            Model.id == attachment_id,
        )
        .first()
    )
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found"
        )

    usages = find_attachment_usages(
        attachment_name=attachment.name,
        attachment_id=attachment_id,
        db=db,
        locale_id=locale_id,
    )

    return AttachmentUsagesResponse(
        attachment_id=attachment_id,
        attachment_name=attachment.name,
        usages=usages,
    )

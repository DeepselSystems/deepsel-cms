import os

from fastapi import Depends, File, Response, UploadFile, status, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from settings import UPLOAD_SIZE_LIMIT
from db import get_db
from deepsel.utils.crud_router import CRUDRouter
from apps.core.utils.get_current_user import (
    get_current_user,
    get_current_user_optional,
)
from apps.core.utils.models_pool import models_pool
from apps.core.schemas.attachment import (
    AttachmentRead,
    AttachmentUpdate,
    AttachmentSearch,
    UploadSizeLimitResponse,
    StorageInfoResponse,
)

table_name = "attachment"
Model = models_pool[table_name]
UserModel = models_pool["user"]

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
    info = Model.check_storage_quota(db)
    return StorageInfoResponse(
        used_storage=info["used_mb"], max_storage=info["max_mb"], unit="MB"
    )


@router.post("", response_model=list[AttachmentRead])
@router.post("/", response_model=list[AttachmentRead])
def upload_files(
    files: list[UploadFile] = File(...),
    alt_text: str = None,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Calculate total size of new files for quota check
    total_new_bytes = 0
    for file in files:
        file.file.seek(0, os.SEEK_END)
        total_new_bytes += file.file.tell()
        file.file.seek(0)

    Model.check_storage_quota(db, total_new_bytes)

    instances = []
    for file in files:
        kwargs = {}
        if alt_text:
            kwargs["alt_text"] = alt_text

        instance = Model().create(db=db, user=user, file=file, **kwargs)
        instances.append(instance)
    return instances


@router.get("/serve/{file_name}")
def serve_file(
    file_name: str,
    response: Response,
    user: UserModel = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    instance = Model.get_by_name(db, file_name)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    result = instance.get_serve_result()
    if result.redirect_url:
        return RedirectResponse(url=result.redirect_url, status_code=302)
    return Response(content=result.content, media_type=result.content_type)

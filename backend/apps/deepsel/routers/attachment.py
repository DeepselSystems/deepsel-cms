import os

from fastapi import Depends, File, Response, UploadFile, status, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from constants import (
    S3,
    S3_BUCKET,
    AZURE_STORAGE_CONNECTION_STRING,
    AZURE_STORAGE_CONTAINER,
    CLAMAV_HOST,
    S3_PRESIGN_EXPIRATION,
    UPLOAD_SIZE_LIMIT,
    MAX_STORAGE_LIMIT,
)
from db import get_db
from apps.deepsel.models.attachment import AttachmentTypeOptions
from apps.deepsel.utils.crud_router import CRUDRouter
from apps.deepsel.utils.generate_crud_schemas import generate_CRUD_schemas
from apps.deepsel.utils.get_current_user import get_current_user
from clamd import ClamdNetworkSocket
from azure.storage.blob import generate_blob_sas, BlobSasPermissions, BlobServiceClient
from datetime import datetime, timedelta, UTC
from apps.deepsel.utils.models_pool import models_pool
from urllib.parse import quote

table_name = "attachment"
CRUDSchemas = generate_CRUD_schemas(table_name)
Model = models_pool[table_name]
UserModel = models_pool["user"]

router = CRUDRouter(
    read_schema=CRUDSchemas.Read,
    search_schema=CRUDSchemas.Search,
    create_schema=CRUDSchemas.Create,
    update_schema=CRUDSchemas.Update,
    table_name=table_name,
    dependencies=[Depends(get_current_user)],
    create_route=False,
    update_route=False,
)


class UploadFileResponse(BaseModel):
    success: bool
    filename: str


class FileUploadData(BaseModel):
    alt_text: str = None


class UploadSizeLimitResponse(BaseModel):
    value: float
    unit: str


class StorageInfoResponse(BaseModel):
    used_storage: float  # in MB
    max_storage: float | None  # in MB, None means unlimited
    unit: str


@router.get("/config/upload_size_limit", response_model=UploadSizeLimitResponse)
def get_upload_size_limit():
    return UploadSizeLimitResponse(value=UPLOAD_SIZE_LIMIT, unit="MB")


@router.get("/storage/info", response_model=StorageInfoResponse)
def get_storage_info(db: Session = Depends(get_db)):
    # Calculate total storage used
    total_size_bytes = db.query(func.sum(Model.filesize)).scalar() or 0
    total_size_mb = total_size_bytes / (1024 * 1024)  # Convert bytes to MB

    return StorageInfoResponse(
        used_storage=total_size_mb, max_storage=MAX_STORAGE_LIMIT, unit="MB"
    )


@router.post("", response_model=list[CRUDSchemas.Read])
@router.post("/", response_model=list[CRUDSchemas.Read])
def upload_files(
    files: list[UploadFile] = File(...),
    alt_text: str = None,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check storage limit if MAX_STORAGE_LIMIT is set
    if MAX_STORAGE_LIMIT is not None:
        # Calculate current total storage used
        current_size_bytes = db.query(func.sum(Model.filesize)).scalar() or 0
        current_size_mb = current_size_bytes / (1024 * 1024)  # Convert bytes to MB

        # Calculate size of new files
        new_files_size = 0
        for file in files:
            file.file.seek(0, os.SEEK_END)
            new_files_size += file.file.tell()
            file.file.seek(0)  # Reset file pointer

        new_files_size_mb = new_files_size / (1024 * 1024)  # Convert bytes to MB

        # Check if upload would exceed the storage limit
        if current_size_mb + new_files_size_mb > MAX_STORAGE_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Upload would exceed storage limit of {MAX_STORAGE_LIMIT} MB. Current usage: {current_size_mb:.2f} MB",
            )

    instances = []
    for file in files:
        if CLAMAV_HOST:
            clamav = ClamdNetworkSocket(CLAMAV_HOST, 3310)
            scan_result = clamav.instream(file.file)
            file.file.seek(0)  # reset file pointer to the beginning
            ok = scan_result["stream"][0] == "OK"
            if not ok:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="File infected!"
                )

        # Include alt_text if provided
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
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Retrieve the file instance from the database
    instance = Model.get_by_name(
        db, file_name
    )  # Update with your actual method to retrieve the file instance
    if not instance:
        response.status_code = status.HTTP_404_NOT_FOUND
        return {"detail": "File not found"}
    if instance.type == AttachmentTypeOptions.s3:
        # Redirect to the S3 pre-signed URL
        presigned_url = S3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": S3_BUCKET, "Key": instance.name},
            ExpiresIn=S3_PRESIGN_EXPIRATION.total_seconds(),
        )
        response.headers["Location"] = presigned_url
        response.status_code = status.HTTP_302_FOUND
        response.media_type = instance.content_type
        return response

    elif instance.type == AttachmentTypeOptions.azure:
        blob_service_client = BlobServiceClient.from_connection_string(
            AZURE_STORAGE_CONNECTION_STRING
        )
        # Get the account key
        account_key = blob_service_client.credential.account_key
        account_name = blob_service_client.account_name
        # Generate the SAS token
        sas_token = generate_blob_sas(
            blob_name=file_name,
            account_name=account_name,
            account_key=account_key,
            container_name=AZURE_STORAGE_CONTAINER,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.now(UTC) + timedelta(minutes=30),
        )
        presigned_url = f"https://{account_name}.blob.core.windows.net/{AZURE_STORAGE_CONTAINER}/{quote(file_name)}?{sas_token}"
        response.headers["Location"] = presigned_url
        response.status_code = status.HTTP_302_FOUND
        response.media_type = instance.content_type
        return response
    elif instance.type == AttachmentTypeOptions.local:
        # Serve the file from the local disk
        try:
            local_path = os.path.join(Model.local_directory, instance.name)
            with open(local_path, "rb") as f:
                content = f.read()
            response.headers["Content-Type"] = instance.content_type
            return Response(content, media_type=instance.content_type)
        except FileNotFoundError:
            response.status_code = status.HTTP_404_NOT_FOUND
            return {"detail": "File not found"}
    else:
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {"detail": "Unsupported file type or storage mechanism"}

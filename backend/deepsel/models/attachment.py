import enum
import logging
import os
import json
from io import BytesIO
from typing import Optional
import traceback
from fastapi import HTTPException, status, UploadFile
from sqlalchemy import Column, Enum, Integer, String
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from constants import (
    FILESYSTEM,
    S3,
    S3_BUCKET,
    UPLOAD_SIZE_LIMIT,
    AZURE_STORAGE_CONTAINER,
    AZURE_STORAGE_CONNECTION_STRING,
    DEFAULT_ORG_ID,
)
from db import Base
from deepsel.mixins.base_model import BaseModel
from deepsel.mixins.orm import DeleteResponse, PermissionAction
import random
import string
from azure.storage.blob import BlobServiceClient, ContentSettings
from deepsel.utils import sanitize_filename
from deepsel.utils.models_pool import models_pool

logger = logging.getLogger(__name__)


def randomize_file_name(filename, length: int = 10):
    characters = string.ascii_letters + string.digits
    file_ext = os.path.splitext(filename)[1]
    file_name_part = os.path.splitext(filename)[0]
    random_string = "".join(random.choice(characters) for _ in range(length))
    new_filename = f"{file_name_part}-{random_string}{file_ext}"

    return new_filename


class AttachmentTypeOptions(enum.Enum):
    s3 = "s3"
    azure = "azure"
    local = "local"
    external = "external"


class AttachmentModel(Base, BaseModel):
    __tablename__ = "attachment"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    type = Column(Enum(AttachmentTypeOptions))
    content_type = Column(String)
    filesize = Column(Integer, nullable=True)  # Size in bytes
    alt_text = Column(String, nullable=True)  # Alternative text for accessibility
    local_directory = os.path.join("files")

    @classmethod
    def get_by_name(cls, db: Session, name: str):
        return db.query(cls).filter(cls.name == name).first()

    @classmethod
    def install_csv_data(
        cls,
        file_name: str,
        db: Session,
        demo_data: bool = False,
        organization_id: int = DEFAULT_ORG_ID,
        base_dir: str = None,
        force_update: bool = False,
        auto_commit: bool = True,
    ):
        data = cls._prepare_csv_data_install(file_name, organization_id, demo_data)

        super_user = (
            db.query(models_pool["user"]).filter_by(string_id="super_user").first()
        )
        if not super_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Required super_user account not found for attachment import",
            )

        for row in data:
            # For attachments, extract file_path from file:file_path before processing
            # This prevents _install_file_column from trying to read it as text
            if "file:file_path" in row:
                row["file_path"] = row.pop("file:file_path")

            for key in list(row.keys()):
                if "/" in key and key.count("/") == 1:
                    cls._install_related_column(key, row, db, organization_id)
                elif ":" in key and key.count(":") == 1:
                    source_type, _ = key.split(":")
                    if source_type == "file":
                        cls._install_file_column(key, row)
                    elif source_type == "json":
                        cls._install_json_column(key, row, db, organization_id)
                    elif source_type == "attachment":
                        cls._install_attachment_column(key, row, db)

            file_path = row.pop("file_path", None)
            filename_override = row.pop("filename", None)

            if not demo_data:
                string_id = row.get("string_id")
                existing = None
                if string_id:
                    query = db.query(cls).filter_by(string_id=string_id)
                    if hasattr(cls, "organization_id"):
                        query = query.filter_by(organization_id=organization_id)
                    existing = query.first()

                if existing:
                    if not force_update:
                        logger.debug(
                            "Attachment with string_id %s already exists, skipping import",
                            string_id,
                        )
                        continue
                    # If force_update is True, we need to update the existing attachment instead of creating new one
                    # Update existing attachment properties
                    for key, value in row.items():
                        if key not in [
                            "file_path",
                            "filename",
                        ]:  # Skip file-related keys that are handled separately
                            setattr(existing, key, value)
                    # Handle file update if needed
                    if not file_path or file_path == "null":
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Attachment import rows must include file_path",
                        )
                    # Resolve file path and update file data
                    resolved_file_path = file_path
                    if not os.path.isabs(resolved_file_path):
                        # Use base_dir if provided, otherwise use CSV file's directory
                        search_dir = base_dir or os.path.dirname(file_name)
                        candidate = os.path.join(search_dir, file_path)
                        if os.path.exists(candidate):
                            resolved_file_path = candidate
                    if not os.path.exists(resolved_file_path):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Attachment source file not found: {file_path}",
                        )
                    # Update file data using the existing attachment's create logic for file updates
                    with open(resolved_file_path, "rb") as file:
                        file_bytes = file.read()
                    upload_filename = filename_override or os.path.basename(file_path)
                    upload_file = UploadFile(
                        file=BytesIO(file_bytes),
                        filename=upload_filename,
                        size=len(file_bytes),
                    )
                    # Use existing attachment's create method for file updates
                    # This will handle updating the file storage and metadata

                    temp_attachment = AttachmentModel()
                    temp_attachment.name = upload_filename
                    temp_attachment.content_type = temp_attachment._guess_content_type(
                        os.path.splitext(upload_filename)[1]
                    )
                    temp_attachment.filesize = len(file_bytes)

                    # Update the existing attachment with new file data
                    existing.name = temp_attachment.name
                    existing.content_type = temp_attachment.content_type
                    existing.filesize = temp_attachment.filesize
                    existing.alt_text = row.get("alt_text", existing.alt_text)

                    if auto_commit:
                        db.commit()
                    logger.debug(f"Updated attachment {string_id}")
                    continue

            if not file_path or file_path == "null":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Attachment import rows must include file_path",
                )

            resolved_file_path = file_path
            if not os.path.isabs(resolved_file_path):
                # Use base_dir if provided, otherwise use CSV file's directory
                search_dir = base_dir or os.path.dirname(file_name)
                candidate = os.path.join(search_dir, file_path)
                if os.path.exists(candidate):
                    resolved_file_path = candidate
            if not os.path.exists(resolved_file_path):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Attachment source file not found: {file_path}",
                )

            with open(resolved_file_path, "rb") as file:
                file_bytes = file.read()

            upload_filename = filename_override or os.path.basename(file_path)
            upload_file = UploadFile(
                file=BytesIO(file_bytes),
                filename=upload_filename,
                size=len(file_bytes),
            )

            attachment = cls()
            attachment.create(
                db=db,
                user=super_user,
                file=upload_file,
                **row,
            )

    def create(self, db: Session, user, file, *args, **kwargs) -> BaseModel:
        [allowed, scope] = self._check_has_permission(PermissionAction.create, user)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to create this resource type",
            )

        # if model has owner_id, only allow users to assign ownership to themselves
        # UNLESS owner_id is already provided (e.g., during CSV import)
        if hasattr(self, "owner_id"):
            if "owner_id" not in kwargs:
                kwargs["owner_id"] = user.id

        # if model has organization_id, only allow users to assign organization to themselves
        # unless they have role super_admin_role
        if hasattr(self, "organization_id"):
            user_roles = user.get_user_roles()
            is_super = any(
                [role.string_id == "super_admin_role" for role in user_roles]
            )
            if not is_super or not kwargs.get("organization_id"):
                kwargs["organization_id"] = user.organization_id

        try:
            # Check file size limit
            file_size = file.size / 1024 / 1024
            if file_size > UPLOAD_SIZE_LIMIT:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File size limit of {UPLOAD_SIZE_LIMIT}MB exceeded",
                )
            # Save the file size in bytes
            kwargs.update({"filesize": file.size})
            # Determine filename; only append random suffix if duplicate exists
            sanitized_filename = sanitize_filename(file.filename)
            new_filename = sanitized_filename
            if not new_filename:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid filename",
                )

            if self.__class__.get_by_name(db, new_filename):
                # Keep original base name but randomize until a unique name is found
                while True:
                    candidate = randomize_file_name(sanitized_filename)
                    if not self.__class__.get_by_name(db, candidate):
                        new_filename = candidate
                        break

            file.filename = new_filename
            file_extension = os.path.splitext(file.filename)[1].lower()
            content_type = self._guess_content_type(file_extension)
            kwargs.update({"content_type": content_type})

            # Save file based on FILESYSTEM environment variable
            if FILESYSTEM == "s3":
                s3_key = f"{new_filename}"
                S3.upload_fileobj(
                    file.file,
                    S3_BUCKET,
                    new_filename,
                    ExtraArgs={
                        "Metadata": {
                            "owner_id": str(user.id),
                            "model": self.__class__.__name__,
                            "field": "name",
                            "record_id": str(id),
                            "original_filename": file.filename,
                        }
                    },
                )

                kwargs["type"] = AttachmentTypeOptions.s3
                kwargs["name"] = s3_key

            elif FILESYSTEM == "azure":
                blob_service_client = BlobServiceClient.from_connection_string(
                    AZURE_STORAGE_CONNECTION_STRING
                )
                container_client = blob_service_client.get_container_client(
                    AZURE_STORAGE_CONTAINER
                )
                blob_client = container_client.get_blob_client(new_filename)
                blob_client.upload_blob(
                    file.file,
                    content_settings=ContentSettings(content_type=content_type),
                )
                kwargs["type"] = AttachmentTypeOptions.azure
                kwargs["name"] = new_filename

            else:
                # local storage
                os.makedirs(self.local_directory, exist_ok=True)
                local_path = os.path.join(self.local_directory, new_filename)
                with open(local_path, "wb") as f:
                    f.write(file.file.read())
                kwargs["type"] = AttachmentTypeOptions.local
                kwargs["name"] = new_filename
            for k, v in kwargs.items():
                setattr(self, k, v)
            db.add(self)
            db.commit()
            db.refresh(self)
            return self
        # catch unique constraint violation
        except IntegrityError as e:
            db.rollback()
            message = str(e.orig)
            detail = message.split("DETAIL:  ")[1]
            logger.error(
                f"Error creating record: {detail}\nFull traceback: {traceback.format_exc()}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error creating record: {detail}",
            )

    def delete(
        self,
        db: Session,
        user,
        force: Optional[bool] = False,
        *args,
        **kwargs,
    ) -> [DeleteResponse]:  # type: ignore
        response = super().delete(db=db, user=user, force=force, *args, **kwargs)
        if self.type == AttachmentTypeOptions.s3:
            try:
                S3.delete_object(Bucket=S3_BUCKET, Key=self.name)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to delete file from S3",
                )
        elif self.type == AttachmentTypeOptions.azure:
            try:
                blob_service_client = BlobServiceClient.from_connection_string(
                    AZURE_STORAGE_CONNECTION_STRING
                )
                container_client = blob_service_client.get_container_client(
                    AZURE_STORAGE_CONTAINER
                )
                blob_client = container_client.get_blob_client(self.name)
                blob_client.delete_blob()
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to delete file from Azure Blob Storage",
                )
        elif self.type == AttachmentTypeOptions.local:
            try:
                local_path = os.path.join(self.local_directory, self.name)
                os.remove(local_path)
            except FileNotFoundError:
                logger.error(
                    f"Object Attachment with string_id {self.string_id} deleted with error: FileNotFoundError"
                )
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to delete file from local storage",
                )
        return response

    def get_data(self):
        if self.type == AttachmentTypeOptions.s3:
            try:
                response = S3.get_object(Bucket=S3_BUCKET, Key=self.name)
                return response["Body"].read()
            except Exception as e:
                logger.error(f"Failed to get file from S3: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve file from S3",
                )
        elif self.type == AttachmentTypeOptions.azure:
            try:
                blob_service_client = BlobServiceClient.from_connection_string(
                    AZURE_STORAGE_CONNECTION_STRING
                )
                container_client = blob_service_client.get_container_client(
                    AZURE_STORAGE_CONTAINER
                )
                blob_client = container_client.get_blob_client(self.name)
                return blob_client.download_blob().readall()
            except Exception as e:
                logger.error(f"Failed to get file from Azure Blob Storage: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve file from Azure Blob Storage",
                )
        elif self.type == AttachmentTypeOptions.local:
            try:
                local_path = os.path.join(self.local_directory, self.name)
                with open(local_path, "rb") as f:
                    return f.read()
            except FileNotFoundError:
                logger.error(f"File not found: {local_path}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="File not found in local storage",
                )
            except Exception as e:
                logger.error(f"Failed to get file from local storage: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve file from local storage",
                )
        elif self.type == AttachmentTypeOptions.external:
            # For external attachments, we might just return the URL or handle differently
            return self.name
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid attachment type",
            )

    @staticmethod
    def _guess_content_type(extension: str) -> str:
        # Define mapping of file extensions to content types
        content_types = {
            ".aac": "audio/aac",
            ".ai": "application/illustrator",
            ".avi": "video/x-msvideo",
            ".bmp": "image/bmp",
            ".bz2": "application/x-bzip2",
            ".css": "text/css",
            ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".eps": "application/postscript",
            ".flac": "audio/flac",
            ".flv": "video/x-flv",
            ".gif": "image/gif",
            ".gz": "application/gzip",
            ".html": "text/html",
            ".ico": "image/vnd.microsoft.icon",
            ".ics": "text/calendar",
            ".indd": "application/x-indesign",
            ".jpeg": "image/jpeg",
            ".jpg": "image/jpeg",
            ".js": "application/javascript",
            ".json": "application/json",
            ".mkv": "video/x-matroska",
            ".mov": "video/quicktime",
            ".mp3": "audio/mpeg",
            ".mp4": "video/mp4",
            ".mpeg": "video/mpeg",
            ".mpg": "video/mpeg",
            ".mpga": "audio/mpeg",
            ".odp": "application/vnd.oasis.opendocument.presentation",
            ".ods": "application/vnd.oasis.opendocument.spreadsheet",
            ".odt": "application/vnd.oasis.opendocument.text",
            ".ogg": "audio/ogg",
            ".opus": "audio/opus",
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".ppt": "application/vnd.ms-powerpoint",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".psd": "image/vnd.adobe.photoshop",
            ".rar": "application/vnd.rar",
            ".rtf": "application/rtf",
            ".svg": "image/svg+xml",
            ".tar": "application/x-tar",
            ".tif": "image/tiff",
            ".tiff": "image/tiff",
            ".txt": "text/plain",
            ".wav": "audio/wav",
            ".webm": "video/webm",
            ".webp": "image/webp",
            ".wmv": "video/x-ms-wmv",
            ".xaml": "application/xaml+xml",
            ".xls": "application/vnd.ms-excel",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xml": "application/xml",
            ".xps": "application/vnd.ms-xpsdocument",
            ".zip": "application/zip",
            # Add more mappings as needed
        }
        return content_types.get(
            extension, "application/octet-stream"
        )  # Default to binary if extension not found

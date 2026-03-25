from pydantic import BaseModel


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

from pydantic import BaseModel


class UploadRequest(BaseModel):
    filename: str
    content_type: str


class PresignedUrlResponse(BaseModel):
    upload_url: str
    object_key: str
    public_url: str

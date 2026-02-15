from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.upload import PresignedUrlResponse, UploadRequest
from app.services.s3 import generate_presigned_upload

router = APIRouter()


@router.post("/presign", response_model=PresignedUrlResponse)
async def get_presigned_url(
    data: UploadRequest,
    _current_user: User = Depends(get_current_user),
):
    try:
        result = generate_presigned_upload(data.filename, data.content_type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return PresignedUrlResponse(**result)

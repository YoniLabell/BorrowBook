from fastapi import APIRouter, Depends, Query

from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.book_detect import BookDetectionResult
from app.services.book_metadata import detect_book_from_image

router = APIRouter()


@router.get("/detect", response_model=BookDetectionResult)
async def detect_book(
    image_url: str = Query(..., description="Public URL of the book image"),
    _current_user: User = Depends(get_current_user),
):
    return await detect_book_from_image(image_url)

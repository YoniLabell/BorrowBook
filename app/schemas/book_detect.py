from typing import Optional

from pydantic import BaseModel


class BookCandidate(BaseModel):
    title: str
    author: str
    isbn: Optional[str] = None
    cover_url: Optional[str] = None
    publisher: Optional[str] = None
    year: Optional[str] = None


class BookDetectionResult(BaseModel):
    detected_title: Optional[str] = None
    detected_author: Optional[str] = None
    detected_isbn: Optional[str] = None
    confidence: str = "low"  # low, medium, high
    candidates: list[BookCandidate] = []
    ocr_text: Optional[str] = None

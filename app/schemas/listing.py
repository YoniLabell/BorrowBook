from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.models.listing import BookCondition, ListingStatus, ListingType


class ListingImageOut(BaseModel):
    id: int
    url: str
    position: int

    model_config = {"from_attributes": True}


class ListingCreate(BaseModel):
    listing_type: ListingType
    title: str = Field(min_length=1, max_length=300)
    author: str = Field(min_length=1, max_length=300)
    isbn: Optional[str] = Field(None, max_length=20)
    language: Optional[str] = Field(None, max_length=50)
    category: Optional[str] = Field(None, max_length=100)
    condition: BookCondition
    description: Optional[str] = None
    price: Optional[float] = None
    max_lend_days: Optional[int] = None
    deposit_amount: Optional[float] = None
    image_urls: list[str] = Field(default_factory=list, max_length=5)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @model_validator(mode="after")
    def validate_type_fields(self):
        if self.listing_type == ListingType.SELL and self.price is None:
            raise ValueError("Price is required for SELL listings")
        return self


class ListingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    author: Optional[str] = Field(None, min_length=1, max_length=300)
    isbn: Optional[str] = None
    language: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[BookCondition] = None
    description: Optional[str] = None
    price: Optional[float] = None
    max_lend_days: Optional[int] = None
    deposit_amount: Optional[float] = None
    status: Optional[ListingStatus] = None
    image_urls: Optional[list[str]] = None


class ListingOut(BaseModel):
    id: int
    owner_id: int
    listing_type: ListingType
    title: str
    author: str
    isbn: Optional[str] = None
    language: Optional[str] = None
    category: Optional[str] = None
    condition: BookCondition
    description: Optional[str] = None
    price: Optional[float] = None
    max_lend_days: Optional[int] = None
    deposit_amount: Optional[float] = None
    status: ListingStatus
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    images: list[ListingImageOut] = []
    distance_km: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ListingSearch(BaseModel):
    q: Optional[str] = None
    radius_km: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    listing_type: Optional[ListingType] = None
    language: Optional[str] = None
    category: Optional[str] = None
    sort: Optional[str] = "newest"  # distance | newest
    page: int = 1
    page_size: int = 20

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.user import PrivacySetting


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    avatar_url: Optional[str] = None
    about: Optional[str] = None
    privacy_setting: Optional[PrivacySetting] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UserOut(BaseModel):
    id: int
    email: str
    display_name: str
    avatar_url: Optional[str] = None
    about: Optional[str] = None
    privacy_setting: PrivacySetting
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime
    avg_rating: Optional[float] = None

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    id: int
    display_name: str
    avatar_url: Optional[str] = None
    about: Optional[str] = None
    created_at: datetime
    avg_rating: Optional[float] = None

    model_config = {"from_attributes": True}

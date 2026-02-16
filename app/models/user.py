import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PrivacySetting(str, enum.Enum):
    EXACT = "exact"
    APPROXIMATE = "approximate"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    about: Mapped[str | None] = mapped_column(Text, nullable=True)
    privacy_setting: Mapped[PrivacySetting] = mapped_column(
        Enum(PrivacySetting, values_callable=lambda e: [x.value for x in e]),
        default=PrivacySetting.APPROXIMATE,
    )
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

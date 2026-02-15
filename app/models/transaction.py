import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TransactionType(str, enum.Enum):
    LOAN = "LOAN"
    SALE = "SALE"


class TransactionState(str, enum.Enum):
    ACCEPTED = "ACCEPTED"
    HANDOVER_CONFIRMED = "HANDOVER_CONFIRMED"
    RETURNED_CONFIRMED = "RETURNED_CONFIRMED"
    COMPLETED = "COMPLETED"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), unique=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id"), index=True)
    borrower_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    transaction_type: Mapped[TransactionType] = mapped_column(Enum(TransactionType))
    state: Mapped[TransactionState] = mapped_column(
        Enum(TransactionState), default=TransactionState.ACCEPTED
    )
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    lend_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.transaction import TransactionState, TransactionType


class TransactionOut(BaseModel):
    id: int
    request_id: int
    listing_id: int
    borrower_id: int
    owner_id: int
    transaction_type: TransactionType
    state: TransactionState
    due_date: Optional[datetime] = None
    lend_days: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TransactionAdvance(BaseModel):
    """Advance the state machine to the next valid state."""
    action: str  # handover_confirmed, returned_confirmed, completed

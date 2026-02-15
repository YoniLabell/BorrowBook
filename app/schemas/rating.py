from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RatingCreate(BaseModel):
    transaction_id: int
    score: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class RatingOut(BaseModel):
    id: int
    transaction_id: int
    rater_id: int
    rated_user_id: int
    score: int
    comment: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

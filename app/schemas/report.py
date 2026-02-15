from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    reported_user_id: int
    reason: str = Field(min_length=1, max_length=50)
    details: Optional[str] = None


class ReportOut(BaseModel):
    id: int
    reporter_id: int
    reported_user_id: int
    reason: str
    details: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

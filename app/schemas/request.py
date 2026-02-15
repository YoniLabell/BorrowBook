from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.request import RequestStatus


class RequestCreate(BaseModel):
    listing_id: int
    message: Optional[str] = None
    proposed_meeting_area: Optional[str] = None
    proposed_meeting_time: Optional[str] = None


class RequestOut(BaseModel):
    id: int
    listing_id: int
    requester_id: int
    owner_id: int
    status: RequestStatus
    message: Optional[str] = None
    proposed_meeting_area: Optional[str] = None
    proposed_meeting_time: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

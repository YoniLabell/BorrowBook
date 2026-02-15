from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    target_user_id: int
    actor_id: Optional[int] = None
    type: str
    payload: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}

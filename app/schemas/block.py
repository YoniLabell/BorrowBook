from datetime import datetime

from pydantic import BaseModel


class BlockCreate(BaseModel):
    blocked_id: int


class BlockOut(BaseModel):
    id: int
    blocker_id: int
    blocked_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

from datetime import datetime

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: int
    transaction_id: int
    user1_id: int
    user2_id: int
    created_at: datetime
    last_message: MessageOut | None = None

    model_config = {"from_attributes": True}

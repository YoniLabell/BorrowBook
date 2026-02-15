from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.conversation import Conversation, Message
from app.models.user import User
from app.schemas.chat import ConversationOut, MessageCreate, MessageOut
from app.services.notifications import create_notification

router = APIRouter()


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .where(
            or_(
                Conversation.user1_id == current_user.id,
                Conversation.user2_id == current_user.id,
            )
        )
        .order_by(Conversation.created_at.desc())
    )
    convos = result.scalars().all()
    out = []
    for conv in convos:
        # Get last message
        msg_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = msg_result.scalar_one_or_none()
        co = ConversationOut.model_validate(conv)
        co.last_message = MessageOut.model_validate(last_msg) if last_msg else None
        out.append(co)
    return out


@router.get("/conversations/{conv_id}/messages", response_model=list[MessageOut])
async def get_messages(
    conv_id: int,
    after_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user1_id != current_user.id and conv.user2_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not a participant")

    stmt = select(Message).where(Message.conversation_id == conv_id)
    if after_id:
        stmt = stmt.where(Message.id > after_id)
    stmt = stmt.order_by(Message.created_at.asc()).limit(limit)

    result = await db.execute(stmt)
    return [MessageOut.model_validate(m) for m in result.scalars().all()]


@router.post("/conversations/{conv_id}/messages", response_model=MessageOut, status_code=201)
async def send_message(
    conv_id: int,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user1_id != current_user.id and conv.user2_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not a participant")

    msg = Message(
        conversation_id=conv_id,
        sender_id=current_user.id,
        body=data.body,
    )
    db.add(msg)
    await db.flush()

    # Notify the other party
    other_id = conv.user2_id if conv.user1_id == current_user.id else conv.user1_id
    await create_notification(
        db,
        target_user_id=other_id,
        actor_id=current_user.id,
        type="new_message",
        payload={"conversation_id": conv_id, "message_preview": data.body[:100]},
    )

    return MessageOut.model_validate(msg)

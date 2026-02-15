"""Helper to create notification rows."""

import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def create_notification(
    db: AsyncSession,
    target_user_id: int,
    actor_id: int | None,
    type: str,
    payload: dict | None = None,
):
    notif = Notification(
        target_user_id=target_user_id,
        actor_id=actor_id,
        type=type,
        payload=json.dumps(payload) if payload else None,
    )
    db.add(notif)
    # Don't commit here; let the caller's session handle it

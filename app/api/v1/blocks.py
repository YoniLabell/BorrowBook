from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.block import Block
from app.models.user import User
from app.schemas.block import BlockCreate, BlockOut

router = APIRouter()


@router.post("", response_model=BlockOut, status_code=201)
async def block_user(
    data: BlockCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.blocked_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    target = await db.get(User, data.blocked_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.execute(
        select(Block).where(Block.blocker_id == current_user.id, Block.blocked_id == data.blocked_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already blocked")

    block = Block(blocker_id=current_user.id, blocked_id=data.blocked_id)
    db.add(block)
    await db.flush()
    return BlockOut.model_validate(block)


@router.delete("/{blocked_id}", status_code=204)
async def unblock_user(
    blocked_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Block).where(Block.blocker_id == current_user.id, Block.blocked_id == blocked_id)
    )
    block = result.scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    await db.delete(block)


@router.get("", response_model=list[BlockOut])
async def list_blocks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Block).where(Block.blocker_id == current_user.id)
    )
    return [BlockOut.model_validate(b) for b in result.scalars().all()]

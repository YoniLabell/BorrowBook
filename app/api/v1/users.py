from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.rating import Rating
from app.models.user import User
from app.schemas.user import UserOut, UserPublic, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    avg = await db.execute(
        select(func.avg(Rating.score)).where(Rating.rated_user_id == current_user.id)
    )
    avg_rating = avg.scalar()
    out = UserOut.model_validate(current_user)
    out.avg_rating = round(float(avg_rating), 2) if avg_rating else None
    return out


@router.patch("/me", response_model=UserOut)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    await db.flush()
    return UserOut.model_validate(current_user)


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="User not found")

    avg = await db.execute(
        select(func.avg(Rating.score)).where(Rating.rated_user_id == user_id)
    )
    avg_rating = avg.scalar()
    out = UserPublic.model_validate(user)
    out.avg_rating = round(float(avg_rating), 2) if avg_rating else None
    return out

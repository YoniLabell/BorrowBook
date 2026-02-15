from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.rating import Rating
from app.models.transaction import Transaction, TransactionState
from app.models.user import User
from app.schemas.rating import RatingCreate, RatingOut

router = APIRouter()


@router.post("", response_model=RatingOut, status_code=201)
async def create_rating(
    data: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tx = await db.get(Transaction, data.transaction_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.state != TransactionState.COMPLETED:
        raise HTTPException(status_code=400, detail="Transaction not completed yet")
    if tx.owner_id != current_user.id and tx.borrower_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not a participant")

    # Determine who is being rated
    rated_user_id = tx.borrower_id if current_user.id == tx.owner_id else tx.owner_id

    # Check for existing rating
    existing = await db.execute(
        select(Rating).where(
            and_(
                Rating.transaction_id == data.transaction_id,
                Rating.rater_id == current_user.id,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already rated")

    rating = Rating(
        transaction_id=data.transaction_id,
        rater_id=current_user.id,
        rated_user_id=rated_user_id,
        score=data.score,
        comment=data.comment,
    )
    db.add(rating)
    await db.flush()
    return RatingOut.model_validate(rating)


@router.get("/user/{user_id}", response_model=list[RatingOut])
async def get_user_ratings(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Rating)
        .where(Rating.rated_user_id == user_id)
        .order_by(Rating.created_at.desc())
    )
    return [RatingOut.model_validate(r) for r in result.scalars().all()]

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.listing import Listing, ListingStatus
from app.models.transaction import Transaction, TransactionState, TransactionType
from app.models.user import User
from app.schemas.transaction import TransactionAdvance, TransactionOut
from app.services.notifications import create_notification

router = APIRouter()

# State machine transitions
VALID_TRANSITIONS = {
    TransactionState.ACCEPTED: {
        "handover_confirmed": TransactionState.HANDOVER_CONFIRMED,
    },
    TransactionState.HANDOVER_CONFIRMED: {
        "returned_confirmed": TransactionState.RETURNED_CONFIRMED,  # LOAN only
        "completed": TransactionState.COMPLETED,  # SALE only
    },
    TransactionState.RETURNED_CONFIRMED: {
        "completed": TransactionState.COMPLETED,
    },
}


@router.get("", response_model=list[TransactionOut])
async def list_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction)
        .where(
            or_(
                Transaction.borrower_id == current_user.id,
                Transaction.owner_id == current_user.id,
            )
        )
        .order_by(Transaction.created_at.desc())
    )
    return [TransactionOut.model_validate(t) for t in result.scalars().all()]


@router.get("/{tx_id}", response_model=TransactionOut)
async def get_transaction(
    tx_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tx = await db.get(Transaction, tx_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.owner_id != current_user.id and tx.borrower_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not a participant")
    return TransactionOut.model_validate(tx)


@router.post("/{tx_id}/advance", response_model=TransactionOut)
async def advance_transaction(
    tx_id: int,
    data: TransactionAdvance,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tx = await db.get(Transaction, tx_id)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.owner_id != current_user.id and tx.borrower_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not a participant")

    transitions = VALID_TRANSITIONS.get(tx.state, {})
    new_state = transitions.get(data.action)
    if not new_state:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{data.action}' for state '{tx.state.value}'",
        )

    # Validate LOAN vs SALE constraints
    if data.action == "returned_confirmed" and tx.transaction_type != TransactionType.LOAN:
        raise HTTPException(status_code=400, detail="Return only applies to loans")
    if data.action == "completed" and tx.state == TransactionState.HANDOVER_CONFIRMED:
        if tx.transaction_type != TransactionType.SALE:
            raise HTTPException(
                status_code=400,
                detail="Sales complete after handover; loans need return confirmation first",
            )

    tx.state = new_state

    # Update listing status
    listing = await db.get(Listing, tx.listing_id)
    if new_state == TransactionState.HANDOVER_CONFIRMED and tx.transaction_type == TransactionType.LOAN:
        listing.status = ListingStatus.LENT
    elif new_state == TransactionState.COMPLETED:
        if tx.transaction_type == TransactionType.SALE:
            listing.status = ListingStatus.SOLD
        else:
            listing.status = ListingStatus.AVAILABLE

    # Notify the other party
    other_id = tx.borrower_id if current_user.id == tx.owner_id else tx.owner_id
    await create_notification(
        db,
        target_user_id=other_id,
        actor_id=current_user.id,
        type="transaction_advanced",
        payload={"transaction_id": tx.id, "new_state": new_state.value},
    )

    return TransactionOut.model_validate(tx)

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.listing import Listing, ListingStatus, ListingType
from app.models.request import Request, RequestStatus
from app.models.transaction import Transaction, TransactionState, TransactionType
from app.models.user import User
from app.schemas.request import RequestCreate, RequestOut
from app.services.notifications import create_notification

router = APIRouter()


@router.post("", response_model=RequestOut, status_code=201)
async def create_request(
    data: RequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    listing = await db.get(Listing, data.listing_id)
    if not listing or listing.status != ListingStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Listing not available")
    if listing.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot request your own listing")

    req = Request(
        listing_id=data.listing_id,
        requester_id=current_user.id,
        owner_id=listing.owner_id,
        message=data.message,
        proposed_meeting_area=data.proposed_meeting_area,
        proposed_meeting_time=data.proposed_meeting_time,
    )
    db.add(req)
    await db.flush()

    await create_notification(
        db,
        target_user_id=listing.owner_id,
        actor_id=current_user.id,
        type="request_created",
        payload={"request_id": req.id, "listing_id": listing.id, "listing_title": listing.title},
    )

    return RequestOut.model_validate(req)


@router.get("", response_model=list[RequestOut])
async def list_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Request)
        .where(or_(Request.requester_id == current_user.id, Request.owner_id == current_user.id))
        .order_by(Request.created_at.desc())
    )
    return [RequestOut.model_validate(r) for r in result.scalars().all()]


@router.post("/{request_id}/accept", response_model=RequestOut)
async def accept_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req = await db.get(Request, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the owner")
    if req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request is not pending")

    req.status = RequestStatus.ACCEPTED
    listing = await db.get(Listing, req.listing_id)
    listing.status = ListingStatus.RESERVED

    # Determine transaction type
    tx_type = TransactionType.LOAN if listing.listing_type == ListingType.LEND else TransactionType.SALE
    due_date = None
    lend_days = None
    if tx_type == TransactionType.LOAN and listing.max_lend_days:
        lend_days = listing.max_lend_days
        due_date = datetime.now(timezone.utc) + timedelta(days=listing.max_lend_days)

    tx = Transaction(
        request_id=req.id,
        listing_id=listing.id,
        borrower_id=req.requester_id,
        owner_id=current_user.id,
        transaction_type=tx_type,
        state=TransactionState.ACCEPTED,
        due_date=due_date,
        lend_days=lend_days,
    )
    db.add(tx)
    await db.flush()

    # Create conversation
    conv = Conversation(
        transaction_id=tx.id,
        user1_id=current_user.id,
        user2_id=req.requester_id,
    )
    db.add(conv)

    await create_notification(
        db,
        target_user_id=req.requester_id,
        actor_id=current_user.id,
        type="request_accepted",
        payload={"request_id": req.id, "listing_title": listing.title},
    )

    return RequestOut.model_validate(req)


@router.post("/{request_id}/decline", response_model=RequestOut)
async def decline_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req = await db.get(Request, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the owner")
    if req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request is not pending")

    req.status = RequestStatus.DECLINED

    await create_notification(
        db,
        target_user_id=req.requester_id,
        actor_id=current_user.id,
        type="request_declined",
        payload={"request_id": req.id},
    )

    return RequestOut.model_validate(req)


@router.post("/{request_id}/cancel", response_model=RequestOut)
async def cancel_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req = await db.get(Request, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the requester")
    if req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request is not pending")

    req.status = RequestStatus.CANCELLED
    return RequestOut.model_validate(req)

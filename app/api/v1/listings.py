from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.listing import Listing, ListingImage
from app.models.user import User
from app.schemas.listing import ListingCreate, ListingOut, ListingUpdate

router = APIRouter()


@router.post("", response_model=ListingOut, status_code=201)
async def create_listing(
    data: ListingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    listing = Listing(
        owner_id=current_user.id,
        listing_type=data.listing_type,
        title=data.title,
        author=data.author,
        isbn=data.isbn,
        language=data.language,
        category=data.category,
        condition=data.condition,
        description=data.description,
        price=data.price,
        max_lend_days=data.max_lend_days,
        deposit_amount=data.deposit_amount,
        latitude=data.latitude or current_user.latitude,
        longitude=data.longitude or current_user.longitude,
    )
    db.add(listing)
    await db.flush()

    for i, url in enumerate(data.image_urls):
        db.add(ListingImage(listing_id=listing.id, url=url, position=i))
    await db.flush()

    # Reload with images
    result = await db.execute(
        select(Listing).options(selectinload(Listing.images)).where(Listing.id == listing.id)
    )
    listing = result.scalar_one()
    return ListingOut.model_validate(listing)


@router.get("/{listing_id}", response_model=ListingOut)
async def get_listing(listing_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Listing).options(selectinload(Listing.images)).where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return ListingOut.model_validate(listing)


@router.patch("/{listing_id}", response_model=ListingOut)
async def update_listing(
    listing_id: int,
    data: ListingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Listing).options(selectinload(Listing.images)).where(Listing.id == listing_id)
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the owner")

    update_data = data.model_dump(exclude_unset=True)
    image_urls = update_data.pop("image_urls", None)

    for key, value in update_data.items():
        setattr(listing, key, value)

    if image_urls is not None:
        # Replace images
        for img in listing.images:
            await db.delete(img)
        await db.flush()
        for i, url in enumerate(image_urls):
            db.add(ListingImage(listing_id=listing.id, url=url, position=i))
        await db.flush()

    # Reload
    result = await db.execute(
        select(Listing).options(selectinload(Listing.images)).where(Listing.id == listing.id)
    )
    listing = result.scalar_one()
    return ListingOut.model_validate(listing)


@router.delete("/{listing_id}", status_code=204)
async def delete_listing(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the owner")
    await db.delete(listing)


@router.get("", response_model=list[ListingOut])
async def my_listings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.images))
        .where(Listing.owner_id == current_user.id)
        .order_by(Listing.created_at.desc())
    )
    return [ListingOut.model_validate(l) for l in result.scalars().all()]

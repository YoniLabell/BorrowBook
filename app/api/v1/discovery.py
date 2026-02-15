import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, and_, or_, func, literal_column
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.listing import Listing, ListingStatus, ListingType
from app.schemas.listing import ListingOut

router = APIRouter()

EARTH_RADIUS_KM = 6371.0


def _haversine_sql(lat: float, lng: float):
    """Return a SQL expression for haversine distance in km."""
    lat_rad = func.radians(Listing.latitude)
    lng_rad = func.radians(Listing.longitude)
    ref_lat_rad = math.radians(lat)
    ref_lng_rad = math.radians(lng)

    dlat = lat_rad - ref_lat_rad
    dlng = lng_rad - ref_lng_rad

    a = func.pow(func.sin(dlat / 2), 2) + func.cos(ref_lat_rad) * func.cos(lat_rad) * func.pow(
        func.sin(dlng / 2), 2
    )
    c = 2 * func.asin(func.sqrt(a))
    return EARTH_RADIUS_KM * c


@router.get("", response_model=list[ListingOut])
async def discover_listings(
    q: str | None = Query(None),
    radius_km: float | None = Query(None),
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    listing_type: ListingType | None = Query(None),
    language: str | None = Query(None),
    category: str | None = Query(None),
    sort: str = Query("newest"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    filters = [Listing.status == ListingStatus.AVAILABLE]

    if q:
        search = f"%{q}%"
        filters.append(
            or_(
                Listing.title.ilike(search),
                Listing.author.ilike(search),
                Listing.isbn.ilike(search),
            )
        )

    if listing_type:
        filters.append(Listing.listing_type == listing_type)
    if language:
        filters.append(Listing.language == language)
    if category:
        filters.append(Listing.category == category)

    has_location = lat is not None and lng is not None
    distance_col = None

    if has_location:
        filters.append(Listing.latitude.isnot(None))
        filters.append(Listing.longitude.isnot(None))
        distance_col = _haversine_sql(lat, lng).label("distance_km")

        if radius_km:
            # Pre-filter using bounding box for performance
            lat_delta = radius_km / 111.0
            lng_delta = radius_km / (111.0 * max(math.cos(math.radians(lat)), 0.01))
            filters.append(Listing.latitude.between(lat - lat_delta, lat + lat_delta))
            filters.append(Listing.longitude.between(lng - lng_delta, lng + lng_delta))

    stmt = select(Listing).options(selectinload(Listing.images)).where(and_(*filters))

    if has_location:
        stmt = stmt.add_columns(distance_col)
        if radius_km:
            stmt = stmt.having(distance_col <= radius_km)
        if sort == "distance":
            stmt = stmt.order_by(distance_col)
        else:
            stmt = stmt.order_by(Listing.created_at.desc())
        stmt = stmt.group_by(Listing.id)
    else:
        stmt = stmt.order_by(Listing.created_at.desc())

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)

    listings_out = []
    if has_location:
        for row in result.all():
            listing = row[0]
            dist = row[1]
            out = ListingOut.model_validate(listing)
            out.distance_km = round(dist, 2) if dist is not None else None
            listings_out.append(out)
    else:
        for listing in result.scalars().all():
            listings_out.append(ListingOut.model_validate(listing))

    return listings_out

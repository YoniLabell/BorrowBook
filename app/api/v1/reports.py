from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.report import Report
from app.models.user import User
from app.schemas.report import ReportCreate, ReportOut

router = APIRouter()


@router.post("", response_model=ReportOut, status_code=201)
async def report_user(
    data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.reported_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
    target = await db.get(User, data.reported_user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    report = Report(
        reporter_id=current_user.id,
        reported_user_id=data.reported_user_id,
        reason=data.reason,
        details=data.details,
    )
    db.add(report)
    await db.flush()
    return ReportOut.model_validate(report)

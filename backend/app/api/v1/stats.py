from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import Branch, QuotaLog, Subject, Unit, Video, VideoClassification

router = APIRouter()
settings = get_settings()


@router.get("/")
async def get_platform_stats(db: AsyncSession = Depends(get_db)):
    """Provides high-level system statistics and health metrics."""
    # Count subjects
    subj_count = await db.scalar(select(func.count(Subject.code)))
    # Count units
    unit_count = await db.scalar(select(func.count(Unit.id)))
    # Count approved videos
    approved_count = await db.scalar(
        select(func.count(VideoClassification.id)).where(VideoClassification.status == "APPROVED")
    )
    # Count rejected videos
    rejected_count = await db.scalar(
        select(func.count(VideoClassification.id)).where(VideoClassification.status == "REJECTED")
    )
    # Total views
    total_views = await db.scalar(select(func.coalesce(func.sum(Video.view_count), 0)))

    # Quota today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    quota_used_today = await db.scalar(
        select(func.coalesce(func.sum(QuotaLog.units_used), 0)).where(
            QuotaLog.timestamp >= today_start,
            QuotaLog.api_type == "YOUTUBE_DATA_V3",
        )
    ) or 0

    return {
        "platform_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "total_subjects": subj_count or 0,
        "total_units": unit_count or 0,
        "approved_videos": approved_count or 0,
        "rejected_videos": rejected_count or 0,
        "total_views": total_views or 0,
        "quota": {
            "daily_limit": settings.YOUTUBE_DAILY_QUOTA_LIMIT,
            "used_today": quota_used_today,
            "remaining_today": max(0, settings.YOUTUBE_DAILY_QUOTA_LIMIT - quota_used_today),
        },
    }

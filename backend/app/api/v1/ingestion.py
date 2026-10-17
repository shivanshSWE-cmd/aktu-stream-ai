from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import ChannelWhitelist, QuotaLog, Video, VideoClassification
from app.schemas.schemas import (
    ChannelWhitelistCreate,
    ChannelWhitelistResponse,
    ClassificationResponse,
    IngestTriggerRequest,
    IngestTriggerResponse,
    QuotaStatusResponse,
)
from app.services.youtube_service import YouTubeQuotaManager
from app.workers.tasks import ingest_channel_videos_worker

router = APIRouter()
settings = get_settings()


@router.get("/whitelist", response_model=List[ChannelWhitelistResponse])
async def list_whitelisted_channels(db: AsyncSession = Depends(get_db)):
    """List all whitelisted YouTube channels configured for quota-conscious ingestion."""
    stmt = select(ChannelWhitelist).order_by(ChannelWhitelist.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/whitelist", response_model=ChannelWhitelistResponse)
async def add_channel_to_whitelist(
    payload: ChannelWhitelistCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Whitelist a YouTube channel.
    Derives uploads playlist ID (UU...) from Channel ID (UC...) to guarantee zero search.list calls.
    """
    channel_id = payload.channel_id.strip()

    # Check if already whitelisted
    stmt = select(ChannelWhitelist).where(ChannelWhitelist.channel_id == channel_id)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Channel is already in whitelist.")

    uploads_playlist_id = YouTubeQuotaManager.derive_uploads_playlist_id(channel_id)

    entry = ChannelWhitelist(
        channel_id=channel_id,
        uploads_playlist_id=uploads_playlist_id,
        channel_title=payload.channel_title,
        branch_code=payload.branch_code,
        is_active=True,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/whitelist/{channel_id}")
async def delete_channel_from_whitelist(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Remove a channel from whitelist."""
    stmt = select(ChannelWhitelist).where(ChannelWhitelist.channel_id == channel_id)
    res = await db.execute(stmt)
    entry = res.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Channel not found in whitelist.")

    await db.delete(entry)
    await db.commit()
    return {"status": "success", "message": f"Channel {channel_id} deleted."}


@router.post("/trigger", response_model=IngestTriggerResponse)
async def trigger_ingestion(
    payload: IngestTriggerRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger quota-budgeted ingestion for a whitelisted channel uploads playlist.
    Enforces the Two-Stage Content Gatekeeper:
    - Filters non-academic content
    - Requires confidence >= 0.70 & is_aktu_or_ai_study == True
    """
    target_channel_id = payload.channel_id

    # If no channel specified, pick first active whitelisted channel
    if not target_channel_id:
        res = await db.execute(select(ChannelWhitelist).where(ChannelWhitelist.is_active == True))
        channel = res.scalars().first()
        if not channel:
            # Create a default seed channel (GateWay Classes AKTU)
            gateway_id = "UCwFA3V77gqLreXm6_Pky4iQ"
            channel = ChannelWhitelist(
                channel_id=gateway_id,
                uploads_playlist_id=YouTubeQuotaManager.derive_uploads_playlist_id(gateway_id),
                channel_title="GateWay Classes",
                branch_code="CSE",
                is_active=True,
            )
            db.add(channel)
            await db.commit()
            await db.refresh(channel)
        target_channel_id = channel.channel_id

    # Run ingestion worker
    result = await ingest_channel_videos_worker(
        db=db,
        channel_id=target_channel_id,
        max_videos=payload.max_videos,
    )

    return IngestTriggerResponse(
        channel_id=result["channel_id"],
        channel_title=result["channel_title"],
        videos_fetched=result["videos_fetched"],
        approved_count=result["approved_count"],
        rejected_count=result["rejected_count"],
        quota_units_used=1 + (1 if result["videos_fetched"] > 0 else 0),
        results=result["results"],
    )


@router.get("/quota", response_model=QuotaStatusResponse)
async def get_quota_status(db: AsyncSession = Depends(get_db)):
    """
    Real-time YouTube Data API v3 quota budget monitor.
    Enforces 10,000 daily quota limit and reports endpoint consumption.
    """
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Sum units used today
    stmt = select(func.coalesce(func.sum(QuotaLog.units_used), 0)).where(
        QuotaLog.timestamp >= today_start,
        QuotaLog.api_type == "YOUTUBE_DATA_V3",
    )
    res = await db.execute(stmt)
    used_today = int(res.scalar_one() or 0)

    # Endpoint breakdown
    ep_stmt = select(QuotaLog.endpoint, func.sum(QuotaLog.units_used)).where(
        QuotaLog.timestamp >= today_start,
        QuotaLog.api_type == "YOUTUBE_DATA_V3",
    ).group_by(QuotaLog.endpoint)
    ep_res = await db.execute(ep_stmt)
    breakdown = {row[0]: int(row[1]) for row in ep_res.all()}

    limit = settings.YOUTUBE_DAILY_QUOTA_LIMIT
    remaining = max(0, limit - used_today)

    return QuotaStatusResponse(
        daily_quota_limit=limit,
        units_used_today=used_today,
        units_remaining_today=remaining,
        is_budget_exceeded=used_today >= limit,
        endpoints_breakdown=breakdown,
    )


@router.get("/audit-log")
async def get_gatekeeper_rejection_audit_log(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Audit feed of rejected videos with rejection reasons and AI confidence scores
    for administrative review and gatekeeper transparency.
    """
    stmt = (
        select(Video, VideoClassification)
        .join(VideoClassification, Video.id == VideoClassification.video_id)
        .where(VideoClassification.status == "REJECTED")
        .order_by(desc(VideoClassification.created_at))
        .limit(limit)
    )
    res = await db.execute(stmt)
    rows = res.all()

    audit_entries = []
    for vid, cl in rows:
        audit_entries.append({
            "video_id": vid.id,
            "title": vid.title,
            "source_url": vid.source_url,
            "thumbnail_url": vid.thumbnail_url,
            "confidence": cl.confidence,
            "status": cl.status,
            "rejection_reason": cl.rejection_reason,
            "created_at": cl.created_at,
        })
    return audit_entries

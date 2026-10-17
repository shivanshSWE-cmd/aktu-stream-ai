from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.models import UserProgress, Video, VideoClassification, VideoTranscript
from app.schemas.schemas import (
    UserProgressResponse,
    UserProgressUpdate,
    VideoDetailResponse,
    VideoResponse,
)

router = APIRouter()


@router.get("/", response_model=List[VideoResponse])
async def list_videos(
    subject_code: Optional[str] = Query(None, description="Filter by subject code"),
    unit_number: Optional[int] = Query(None, ge=1, le=5, description="Filter by unit number (1-5)"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    List approved academic videos for student feeds.
    Strictly excludes rejected or unverified videos.
    """
    stmt = (
        select(Video)
        .join(VideoClassification, Video.id == VideoClassification.video_id)
        .where(VideoClassification.status == "APPROVED")
        .options(selectinload(Video.classification))
    )

    if subject_code:
        stmt = stmt.where(VideoClassification.subject_code == subject_code.upper())
    if unit_number:
        stmt = stmt.where(VideoClassification.unit_number == unit_number)

    stmt = stmt.order_by(Video.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{video_id}", response_model=VideoDetailResponse)
async def get_video_detail(video_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get comprehensive video details including:
    - Master HLS URL or YouTube embed info
    - Gatekeeper classification output (confidence, subject, unit, summary)
    - Full transcript with timestamp segments for jumping
    """
    stmt = (
        select(Video)
        .where(Video.id == video_id)
        .options(
            selectinload(Video.classification),
            selectinload(Video.transcript),
        )
    )
    result = await db.execute(stmt)
    video = result.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    return video


@router.post("/{video_id}/view")
async def record_video_view(video_id: str, db: AsyncSession = Depends(get_db)):
    """Increment video view count."""
    stmt = select(Video).where(Video.id == video_id)
    result = await db.execute(stmt)
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    video.view_count += 1
    await db.commit()
    return {"status": "success", "view_count": video.view_count}


@router.post("/{video_id}/progress", response_model=UserProgressResponse)
async def update_watch_progress(
    video_id: str,
    payload: UserProgressUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Track student watch progress per session (PRD Section 4.3).
    Stores current seconds and completion mark for unit completion tracking.
    """
    # Verify video exists
    v_stmt = select(Video).where(Video.id == video_id)
    v_res = await db.execute(v_stmt)
    if not v_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Video not found.")

    stmt = select(UserProgress).where(
        UserProgress.session_id == payload.session_id,
        UserProgress.video_id == video_id,
    )
    res = await db.execute(stmt)
    prog = res.scalar_one_or_none()

    if not prog:
        prog = UserProgress(
            session_id=payload.session_id,
            video_id=video_id,
            last_position_seconds=payload.position_seconds,
            is_completed=payload.is_completed,
        )
        db.add(prog)
    else:
        prog.last_position_seconds = payload.position_seconds
        if payload.is_completed:
            prog.is_completed = True

    await db.commit()
    await db.refresh(prog)
    return prog


@router.get("/user/{session_id}/progress", response_model=List[UserProgressResponse])
async def get_user_session_progress(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Fetch all watch progress records for a student session."""
    stmt = select(UserProgress).where(UserProgress.session_id == session_id)
    result = await db.execute(stmt)
    return result.scalars().all()

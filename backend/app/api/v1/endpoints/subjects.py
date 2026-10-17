from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.subject import Branch, Subject, Unit
from app.models.video import Video, VideoClassification
from app.schemas.subject import (
    BranchResponse,
    SubjectResponse,
    SubjectWithUnitsResponse,
    UnitResponse,
)
from app.schemas.video import VideoResponse

router = APIRouter()


@router.get("/branches", response_model=List[BranchResponse])
async def list_branches(db: AsyncSession = Depends(get_db)):
    """List all available engineering branches and study tracks."""
    result = await db.execute(select(Branch).where(Branch.is_active == True))
    return result.scalars().all()


@router.get("/", response_model=List[SubjectResponse])
async def list_subjects(
    branch_code: Optional[str] = Query(None, description="Filter by branch code (CSE, IT, AIML, EE, etc.)"),
    semester: Optional[int] = Query(None, ge=1, le=8, description="Filter by semester (1-8)"),
    db: AsyncSession = Depends(get_db),
):
    """List AKTU subjects filtered by branch and semester."""
    stmt = select(Subject).where(Subject.is_active == True)
    if branch_code:
        stmt = stmt.where(Subject.branch_code == branch_code.upper())
    if semester:
        stmt = stmt.where(Subject.semester == semester)
    stmt = stmt.order_by(Subject.semester, Subject.code)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{code}", response_model=SubjectWithUnitsResponse)
async def get_subject_detail(code: str, db: AsyncSession = Depends(get_db)):
    """Get subject details with all 5 syllabus units."""
    stmt = (
        select(Subject)
        .where(Subject.code == code.upper())
        .options(selectinload(Subject.units))
    )
    result = await db.execute(stmt)
    subj = result.scalar_one_or_none()
    if not subj:
        raise HTTPException(status_code=404, detail=f"Subject with code '{code}' not found.")
    return subj


@router.get("/{code}/units/{unit_number}", response_model=UnitResponse)
async def get_unit_detail(
    code: str,
    unit_number: int,
    db: AsyncSession = Depends(get_db),
):
    """Get specific Unit (1 to 5) syllabus topics for a subject."""
    if unit_number < 1 or unit_number > 5:
        raise HTTPException(status_code=400, detail="Unit number must be strictly between 1 and 5.")

    stmt = select(Unit).where(
        Unit.subject_code == code.upper(),
        Unit.unit_number == unit_number,
    )
    result = await db.execute(stmt)
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(
            status_code=404,
            detail=f"Unit {unit_number} not found for subject {code}.",
        )
    return unit


@router.get("/{code}/units/{unit_number}/videos", response_model=List[VideoResponse])
async def get_unit_videos(
    code: str,
    unit_number: int,
    db: AsyncSession = Depends(get_db),
):
    """Get verified, gatekeeper-approved video lecture stream feed for a specific Unit."""
    if unit_number < 1 or unit_number > 5:
        raise HTTPException(status_code=400, detail="Unit number must be between 1 and 5.")

    stmt = (
        select(Video)
        .join(VideoClassification, Video.id == VideoClassification.video_id)
        .where(
            VideoClassification.subject_code == code.upper(),
            VideoClassification.unit_number == unit_number,
            VideoClassification.status == "APPROVED",
        )
        .options(selectinload(Video.classification))
        .order_by(Video.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()

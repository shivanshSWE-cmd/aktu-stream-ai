import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import Video, VideoClassification
from app.schemas.schemas import (
    PresignedUploadRequest,
    PresignedUploadResponse,
    TranscodingStatusResponse,
    UploadCompleteRequest,
)
from app.services.classifier_service import TwoStageClassifier
from app.services.storage_service import StorageService
from app.workers.tasks import transcode_native_upload_worker

router = APIRouter()
settings = get_settings()
storage_service = StorageService()


@router.post("/presigned-url", response_model=PresignedUploadResponse)
async def get_presigned_upload_url(
    payload: PresignedUploadRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate direct-to-S3 presigned PUT URL for native student MP4 upload.
    Bypasses web server memory entirely to achieve modular storage abstraction.
    """
    video_id = str(uuid.uuid4())

    # Generate presigned URL
    res = storage_service.generate_presigned_upload_url(
        video_id=video_id,
        filename=payload.filename,
        content_type=payload.content_type,
    )

    # Pre-create video entity in UPLOADING / PENDING state
    video = Video(
        id=video_id,
        title=payload.title,
        description=f"Student uploaded lecture for {payload.subject_code or 'AKTU'} Unit {payload.unit_number or 1}",
        source_type="NATIVE",
        source_url=None,
        s3_raw_key=res["raw_s3_key"],
        duration_seconds=0,
        thumbnail_url="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
    )
    db.add(video)

    # Initial classification
    classification = VideoClassification(
        video_id=video_id,
        subject_code=payload.subject_code or "AI_GENERAL",
        unit_number=payload.unit_number or 1,
        is_aktu_or_ai_study=True,
        confidence=0.90,
        status="PENDING",
        summary="Awaiting HLS transcoding and gatekeeper verification.",
    )
    db.add(classification)
    await db.commit()

    return PresignedUploadResponse(
        video_id=video_id,
        raw_s3_key=res["raw_s3_key"],
        upload_url=res["upload_url"],
        expires_in_seconds=res["expires_in_seconds"],
        headers=res["headers"],
    )


@router.post("/complete")
async def notify_upload_complete(
    payload: UploadCompleteRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Invoked by frontend when file has finished uploading directly to S3.
    Triggers asynchronous HLS multi-bitrate transcoding worker.
    """
    stmt = select(Video).where(Video.id == payload.video_id)
    res = await db.execute(stmt)
    video = res.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video record not found.")

    # Trigger background worker for transcoding
    background_tasks.add_task(
        transcode_native_upload_worker,
        db=db,
        video_id=payload.video_id,
        raw_s3_key=payload.raw_s3_key,
    )

    return {
        "status": "PROCESSING",
        "video_id": payload.video_id,
        "message": "Transcoding pipeline started in background.",
    }


@router.get("/status/{video_id}", response_model=TranscodingStatusResponse)
async def check_transcoding_status(
    video_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Poll status of video transcoding and HLS master playlist availability.
    """
    stmt = select(Video).where(Video.id == video_id)
    res = await db.execute(stmt)
    video = res.scalar_one_or_none()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    if video.s3_hls_master_url:
        return TranscodingStatusResponse(
            video_id=video_id,
            status="READY",
            progress_percentage=100,
            hls_master_url=video.s3_hls_master_url,
        )

    return TranscodingStatusResponse(
        video_id=video_id,
        status="PROCESSING",
        progress_percentage=45,
        hls_master_url=None,
    )

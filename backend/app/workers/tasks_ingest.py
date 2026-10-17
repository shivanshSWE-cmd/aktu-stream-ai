import logging
from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.models.subject import Subject
from app.models.video import ChannelWhitelist, Video, VideoClassification, VideoTranscript
from app.services.classifier import TwoStageClassifier
from app.services.transcript_service import TranscriptService
from app.services.youtube import YouTubeService

logger = logging.getLogger(__name__)
settings = get_settings()


async def ingest_channel_videos_worker(
    db: AsyncSession, channel_id: str, max_videos: int = 10
) -> Dict[str, Any]:
    """
    Background Task: Ingest videos from a whitelisted channel uploads playlist.
    1. Strict Quota: Queries uploads playlist (UU...) via playlistItems.list and videos.list.
    2. Extracts Hindi/English transcript via youtube-transcript-api.
    3. Runs Two-Stage AI Classifier (Heuristic + Gemini 3.8 Flash).
    4. Enforces Content Gatekeeping: Confidence >= 0.70 & is_aktu_or_ai_study == True.
    """
    yt_service = YouTubeService()
    classifier = TwoStageClassifier()

    # 1. Fetch channel info from whitelist
    stmt = select(ChannelWhitelist).where(ChannelWhitelist.channel_id == channel_id)
    res = await db.execute(stmt)
    whitelist_entry = res.scalar_one_or_none()
    channel_title = whitelist_entry.channel_title if whitelist_entry else "AKTU Engineering Channel"

    # 2. Fetch upload items (1 quota unit)
    raw_videos = await yt_service.fetch_channel_uploads(db, channel_id, max_results=max_videos)

    results = []
    approved_count = 0
    rejected_count = 0

    for item in raw_videos:
        yt_id = item["youtube_id"]

        # Check if video already exists in database
        existing_stmt = select(Video).where(Video.youtube_video_id == yt_id)
        existing_res = await db.execute(existing_stmt)
        if existing_res.scalar_one_or_none():
            logger.info(f"Video {yt_id} already ingested. Skipping duplicate.")
            continue

        # 3. Extract Transcript
        transcript_data = TranscriptService.fetch_youtube_transcript(yt_id)
        transcript_snippet = transcript_data.get("classifier_snippet", "")

        # 4. Two-Stage Classifier Verification
        classification_result = await classifier.classify_video(
            title=item["title"],
            channel_title=item.get("channel_title") or channel_title,
            description=item.get("description", ""),
            tags=item.get("tags", []),
            transcript_snippet=transcript_snippet,
            duration_seconds=item.get("duration_seconds", 0),
        )

        # 5. Content Gatekeeper Check: Confidence >= 0.70 & is_aktu_or_ai_study == True
        is_approved = (
            classification_result.is_aktu_or_ai_study
            and classification_result.confidence >= settings.CLASSIFIER_CONFIDENCE_THRESHOLD
        )

        status = "APPROVED" if is_approved else "REJECTED"
        if is_approved:
            approved_count += 1
        else:
            rejected_count += 1

        # 6. Persist Video Record
        video = Video(
            title=item["title"],
            description=item.get("description", ""),
            source_type="YOUTUBE",
            source_url=f"https://www.youtube.com/watch?v={yt_id}",
            youtube_video_id=yt_id,
            duration_seconds=item.get("duration_seconds", 0),
            thumbnail_url=item.get("thumbnail_url", ""),
            view_count=item.get("view_count", 0),
        )
        db.add(video)
        await db.flush()

        # Persist Classification
        classification = VideoClassification(
            video_id=video.id,
            subject_code=classification_result.subject_code if is_approved else None,
            unit_number=classification_result.unit_number if is_approved else None,
            is_aktu_or_ai_study=classification_result.is_aktu_or_ai_study,
            confidence=round(classification_result.confidence, 3),
            status=status,
            summary=classification_result.summary,
            rejection_reason=classification_result.rejection_reason if not is_approved else None,
            topics_covered=classification_result.topics_covered,
        )
        db.add(classification)

        # Persist Transcript
        if transcript_data.get("full_text"):
            transcript_rec = VideoTranscript(
                video_id=video.id,
                language=transcript_data.get("language", "en"),
                full_text=transcript_data["full_text"],
                segments=transcript_data["segments"],
            )
            db.add(transcript_rec)

        results.append({
            "video_id": video.id,
            "youtube_id": yt_id,
            "title": video.title,
            "status": status,
            "subject_code": classification_result.subject_code if is_approved else None,
            "unit_number": classification_result.unit_number if is_approved else None,
            "confidence": classification_result.confidence,
            "reason": classification_result.rejection_reason if not is_approved else None,
        })

    await db.commit()

    return {
        "channel_id": channel_id,
        "channel_title": channel_title,
        "videos_fetched": len(raw_videos),
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "results": results,
    }

import logging
from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.video import Video
from app.services.storage import HLSTranscoder

logger = logging.getLogger(__name__)


async def transcode_native_upload_worker(
    db: AsyncSession, video_id: str, raw_s3_key: str
) -> Dict[str, Any]:
    """
    Background Task: Executes HLS multi-bitrate transcoding for student uploads.
    Generates 1080p, 720p, 480p, and 360p segments and updates master playlist.
    """
    transcoder = HLSTranscoder()
    transcode_result = await transcoder.transcode_video_to_hls(video_id, raw_s3_key)

    # Update video with master playlist URL
    stmt = select(Video).where(Video.id == video_id)
    res = await db.execute(stmt)
    video = res.scalar_one_or_none()
    if video:
        video.s3_hls_master_url = transcode_result["master_url"]
        await db.commit()

    return transcode_result

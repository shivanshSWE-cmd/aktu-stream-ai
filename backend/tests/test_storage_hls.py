import pytest
from app.services.storage_service import StorageService
from app.services.transcoder_service import HLSTranscoder


def test_storage_presigned_upload_generation():
    storage = StorageService()
    res = storage.generate_presigned_upload_url(
        video_id="test-vid-123",
        filename="lecture unit 1.mp4",
        content_type="video/mp4",
    )

    assert res["video_id"] == "test-vid-123"
    assert "test-vid-123" in res["raw_s3_key"]
    assert "lecture_unit_1.mp4" in res["raw_s3_key"]
    assert res["headers"]["Content-Type"] == "video/mp4"
    assert "upload_url" in res


def test_hls_master_playlist_format():
    transcoder = HLSTranscoder()
    master = transcoder.generate_master_playlist_content()

    # Verify standard HLS tags
    assert master.startswith("#EXTM3U")
    assert "#EXT-X-VERSION:3" in master
    assert "stream_0.m3u8" in master
    assert "stream_1.m3u8" in master
    assert "stream_2.m3u8" in master
    assert "stream_3.m3u8" in master
    assert "RESOLUTION=1920x1080" in master
    assert "RESOLUTION=1280x720" in master
    assert "RESOLUTION=854x480" in master
    assert "RESOLUTION=640x360" in master


@pytest.mark.asyncio
async def test_transcode_pipeline_simulation():
    transcoder = HLSTranscoder()
    res = await transcoder.transcode_video_to_hls(
        video_id="mock-unit-transcode-456",
        raw_s3_key="raw/mock-unit-transcode-456/sample.mp4",
    )

    assert res["status"] == "READY"
    assert res["video_id"] == "mock-unit-transcode-456"
    assert "master.m3u8" in res["master_url"]

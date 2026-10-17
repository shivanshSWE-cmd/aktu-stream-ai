import pytest
from app.services.youtube_service import YouTubeQuotaManager, QuotaExceededError


def test_derive_uploads_playlist_id():
    """Verify conversion of Channel ID (UC...) to uploads playlist ID (UU...)."""
    channel_id = "UCwFA3V77gqLreXm6_Pky4iQ"
    expected = "UUwFA3V77gqLreXm6_Pky4iQ"
    result = YouTubeQuotaManager.derive_uploads_playlist_id(channel_id)
    assert result == expected
    assert result.startswith("UU")


def test_derive_uploads_playlist_invalid():
    """Verify invalid channel IDs raise ValueError."""
    with pytest.raises(ValueError, match="Must begin with 'UC'"):
        YouTubeQuotaManager.derive_uploads_playlist_id("XX1234567890")


@pytest.mark.asyncio
async def test_search_list_is_strictly_forbidden(db_session):
    """Verify that calling search.list triggers PermissionError to protect quota."""
    with pytest.raises(PermissionError, match="search.list' is strictly prohibited"):
        await YouTubeQuotaManager.verify_and_log_quota(
            db=db_session,
            endpoint="search.list",
            units_required=100,
        )


@pytest.mark.asyncio
async def test_quota_logging_and_budget_enforcement(db_session):
    """Verify quota usage is tracked and enforces daily limit."""
    initial_used = await YouTubeQuotaManager.get_units_used_today(db_session)
    assert initial_used == 0

    # Log 1 unit for playlistItems.list
    await YouTubeQuotaManager.verify_and_log_quota(
        db=db_session,
        endpoint="playlistItems.list",
        units_required=1,
    )
    after_one = await YouTubeQuotaManager.get_units_used_today(db_session)
    assert after_one == 1

    # Attempting to exceed 10,000 units raises QuotaExceededError
    with pytest.raises(QuotaExceededError):
        await YouTubeQuotaManager.verify_and_log_quota(
            db=db_session,
            endpoint="videos.list",
            units_required=10005,
        )

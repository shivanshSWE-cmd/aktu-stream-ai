import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import get_settings
from app.models.models import ChannelWhitelist, QuotaLog

logger = logging.getLogger(__name__)
settings = get_settings()


class QuotaExceededError(Exception):
    """Raised when YouTube Data API v3 daily quota limit is reached."""
    pass


class YouTubeQuotaManager:
    """Tracks and enforces strict quota budgeting for YouTube Data API calls."""

    @staticmethod
    def derive_uploads_playlist_id(channel_id: str) -> str:
        """
        Derive uploads playlist ID (UU...) from Channel ID (UC...).
        YouTube channels map UC<suffix> to UU<suffix> for all uploads.
        """
        clean_id = channel_id.strip()
        if not clean_id.startswith("UC"):
            raise ValueError(f"Invalid YouTube Channel ID '{clean_id}'. Must begin with 'UC'.")
        return "UU" + clean_id[2:]

    @staticmethod
    async def get_units_used_today(db: AsyncSession) -> int:
        """Calculate total quota units expended today (UTC)."""
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        stmt = select(func.coalesce(func.sum(QuotaLog.units_used), 0)).where(
            QuotaLog.timestamp >= today_start,
            QuotaLog.api_type == "YOUTUBE_DATA_V3"
        )
        result = await db.execute(stmt)
        return int(result.scalar_one() or 0)

    @classmethod
    async def verify_and_log_quota(
        cls, db: AsyncSession, endpoint: str, units_required: int, details: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Enforce strict quota budgeting. Rejects forbidden calls (e.g. search.list)
        and prevents going over the 10,000 daily budget.
        """
        if "search" in endpoint.lower():
            raise PermissionError("VIOLATION: 'search.list' is strictly prohibited by platform quota policy.")

        used = await cls.get_units_used_today(db)
        if used + units_required > settings.YOUTUBE_DAILY_QUOTA_LIMIT:
            logger.error(
                f"YouTube quota budget exceeded: used={used}, required={units_required}, limit={settings.YOUTUBE_DAILY_QUOTA_LIMIT}"
            )
            raise QuotaExceededError(
                f"YouTube daily quota limit of {settings.YOUTUBE_DAILY_QUOTA_LIMIT} reached (used {used})."
            )

        log = QuotaLog(
            api_type="YOUTUBE_DATA_V3",
            endpoint=endpoint,
            units_used=units_required,
            details=details or {},
            timestamp=datetime.now(timezone.utc),
        )
        db.add(log)
        await db.commit()


class YouTubeService:
    """
    Production-ready YouTube Data API v3 service adhering strictly to quota budgeting:
    - Zero search.list calls
    - ONLY playlistItems.list (1 unit) & videos.list (1 unit per 50 videos batch)
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.YOUTUBE_API_KEY
        self._client = None

    def _get_client(self):
        if not self._client and self.api_key:
            self._client = build("youtube", "v3", developerKey=self.api_key)
        return self._client

    @staticmethod
    def parse_iso8601_duration(duration_str: str) -> int:
        """Parses ISO 8601 duration strings like PT1H23M45S into total seconds."""
        match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration_str)
        if not match:
            return 0
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        return hours * 3600 + minutes * 60 + seconds

    async def fetch_channel_uploads(
        self, db: AsyncSession, channel_id: str, max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Fetches latest uploaded videos for a channel using ONLY `playlistItems.list`.
        Costs exactly 1 quota unit.
        """
        uploads_playlist_id = YouTubeQuotaManager.derive_uploads_playlist_id(channel_id)

        # Enforce quota log: 1 unit for playlistItems.list
        await YouTubeQuotaManager.verify_and_log_quota(
            db,
            endpoint="playlistItems.list",
            units_required=1,
            details={"channel_id": channel_id, "playlist_id": uploads_playlist_id, "max_results": max_results}
        )

        client = self._get_client()
        if not client:
            logger.warning("YouTube API client not initialized (missing API key). Using mock data.")
            return self._generate_mock_channel_uploads(channel_id, max_results)

        try:
            req = client.playlistItems().list(
                part="snippet,contentDetails",
                playlistId=uploads_playlist_id,
                maxResults=min(max_results, 50),
            )
            resp = req.execute()

            items = resp.get("items", [])
            video_ids = [it["contentDetails"]["videoId"] for it in items if "contentDetails" in it]
            if not video_ids:
                return []

            # Batch fetch video details using videos.list (1 unit for up to 50 videos)
            video_details = await self.fetch_video_details_batch(db, video_ids)
            return video_details

        except HttpError as e:
            logger.error(f"YouTube API HttpError during playlistItems.list: {e}")
            raise

    async def fetch_video_details_batch(
        self, db: AsyncSession, video_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Batch query video details with `videos.list`.
        Costs 1 quota unit for up to 50 video IDs.
        """
        if not video_ids:
            return []

        # Batch in chunks of 50
        results: List[Dict[str, Any]] = []
        for i in range(0, len(video_ids), 50):
            chunk = video_ids[i:i + 50]
            await YouTubeQuotaManager.verify_and_log_quota(
                db,
                endpoint="videos.list",
                units_required=1,
                details={"chunk_size": len(chunk)}
            )

            client = self._get_client()
            if not client:
                for vid in chunk:
                    results.append(self._generate_mock_video_detail(vid))
                continue

            req = client.videos().list(
                part="snippet,contentDetails,statistics",
                id=",".join(chunk)
            )
            resp = req.execute()

            for item in resp.get("items", []):
                snippet = item.get("snippet", {})
                content = item.get("contentDetails", {})
                stats = item.get("statistics", {})

                duration_secs = self.parse_iso8601_duration(content.get("duration", "PT0S"))
                thumb = (
                    snippet.get("thumbnails", {}).get("maxres", {}).get("url")
                    or snippet.get("thumbnails", {}).get("high", {}).get("url")
                    or snippet.get("thumbnails", {}).get("default", {}).get("url")
                    or ""
                )

                results.append({
                    "youtube_id": item["id"],
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", ""),
                    "channel_title": snippet.get("channelTitle", ""),
                    "channel_id": snippet.get("channelId", ""),
                    "published_at": snippet.get("publishedAt"),
                    "duration_seconds": duration_secs,
                    "thumbnail_url": thumb,
                    "view_count": int(stats.get("viewCount", 0)),
                    "tags": snippet.get("tags", []),
                })

        return results

    def _generate_mock_channel_uploads(self, channel_id: str, count: int) -> List[Dict[str, Any]]:
        """Mock fallback for offline development & tests when API key is unset."""
        mock_videos = [
            {
                "youtube_id": "dQw4w9WgXcQ",
                "title": "AKTU BCS501 DBMS Unit 2 Relational Algebra & Calculus Complete One Shot",
                "description": "Dr. APJ Abdul Kalam Technical University 5th Semester Computer Science DBMS Unit 2. Topics: Relational Algebra, Tuple Relational Calculus, Domain Relational Calculus, Joins and Selection operations.",
                "channel_title": "GateWay Classes",
                "channel_id": channel_id,
                "duration_seconds": 3840,
                "thumbnail_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
                "view_count": 48200,
                "tags": ["AKTU", "BCS501", "DBMS", "Unit 2", "GateWay Classes", "B.Tech"],
            },
            {
                "youtube_id": "k7yqLg9V0w1",
                "title": "BCS301 Data Structures Unit 3 Binary Search Trees & AVL Trees AKTU",
                "description": "Complete lecture on Unit 3 for BCS301 Data Structures in AKTU B.Tech 3rd Semester. Covering Tree Traversals, BST Insertion/Deletion, and AVL rotations.",
                "channel_title": "GateWay Classes",
                "channel_id": channel_id,
                "duration_seconds": 2940,
                "thumbnail_url": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
                "view_count": 31200,
                "tags": ["AKTU", "BCS301", "Data Structures", "Unit 3", "AVL Trees"],
            },
            {
                "youtube_id": "v91Lk98ZaBc",
                "title": "Top 10 Minecraft Building Tips and Funny Gameplay Moments",
                "description": "Check out these crazy Minecraft gaming tips and epic fails! Don't forget to like and subscribe for more funny gaming clips.",
                "channel_title": "GateWay Classes",
                "channel_id": channel_id,
                "duration_seconds": 720,
                "thumbnail_url": "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80",
                "view_count": 9400,
                "tags": ["gaming", "minecraft", "funny"],
            }
        ]
        return mock_videos[:count]

    def _generate_mock_video_detail(self, video_id: str) -> Dict[str, Any]:
        return {
            "youtube_id": video_id,
            "title": f"AKTU Lecture Video {video_id}",
            "description": "AKTU B.Tech Semester Course Lecture Video",
            "channel_title": "AKTU Technical Lectures",
            "channel_id": "UC_MOCK_CHANNEL",
            "duration_seconds": 2400,
            "thumbnail_url": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
            "view_count": 12000,
            "tags": ["AKTU", "B.Tech"],
        }

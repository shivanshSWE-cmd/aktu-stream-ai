import logging
import redis.asyncio as aioredis
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

redis_pool = None


async def get_redis_client():
    """Returns async Redis client from connection pool."""
    global redis_pool
    if redis_pool is None:
        try:
            redis_pool = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        except Exception as e:
            logger.warning(f"Could not connect to Redis at {settings.REDIS_URL}: {e}")
            return None
    return redis_pool


async def close_redis_client():
    """Closes Redis connection pool."""
    global redis_pool
    if redis_pool:
        await redis_pool.close()
        redis_pool = None

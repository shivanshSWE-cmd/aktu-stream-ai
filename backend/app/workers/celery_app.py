import logging
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Asynchronous task queue configuration for Redis
REDIS_SETTINGS = {
    "redis_url": settings.REDIS_URL,
    "max_connections": 20,
    "retry_on_timeout": True,
}


class WorkerSettings:
    functions = []
    redis_settings = settings.REDIS_URL
    max_jobs = 10
    poll_delay = 0.5

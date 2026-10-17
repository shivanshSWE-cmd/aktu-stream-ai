import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import get_settings
from app.core.database import async_session_factory, engine, Base, switch_to_sqlite_fallback
from app.services.taxonomy_service import seed_taxonomy
from app.services.youtube_service import QuotaExceededError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("aktu_stream")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize schemas and seed official AKTU taxonomy."""
    logger.info("Initializing database tables and constraints...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning(f"Primary database connection failed ({e}). Switching to local SQLite fallback.")
        await switch_to_sqlite_fallback()

    logger.info("Seeding official AKTU B.Tech curriculum taxonomy...")
    async with async_session_factory() as session:
        try:
            await seed_taxonomy(session)
            logger.info("AKTU taxonomy seeded successfully.")
        except Exception as e:
            logger.error(f"Error seeding taxonomy: {e}")

    yield

    logger.info("Shutting down AKTU Stream AI service...")
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise-grade educational streaming platform for AKTU engineering & AI/ML study tracks.",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.exception_handler(QuotaExceededError)
async def quota_exceeded_handler(request: Request, exc: QuotaExceededError):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": str(exc), "error": "YOUTUBE_QUOTA_EXCEEDED"},
    )


@app.get("/")
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR,
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "aktu-stream-ai-backend"}

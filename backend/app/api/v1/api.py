from fastapi import APIRouter
from app.api.v1.subjects import router as subjects_router
from app.api.v1.videos import router as videos_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.upload import router as upload_router
from app.api.v1.search import router as search_router
from app.api.v1.stats import router as stats_router

api_router = APIRouter()

api_router.include_router(subjects_router, prefix="/subjects", tags=["Subjects & Syllabus"])
api_router.include_router(videos_router, prefix="/videos", tags=["Videos & Streams"])
api_router.include_router(ingestion_router, prefix="/ingestion", tags=["Ingestion & Quota Budgeting"])
api_router.include_router(upload_router, prefix="/upload", tags=["Direct S3 Upload & Transcoding"])
api_router.include_router(search_router, prefix="/search", tags=["Semantic Vector Search"])
api_router.include_router(stats_router, prefix="/stats", tags=["System Statistics"])

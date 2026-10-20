from fastapi import APIRouter
from app.api.v1.endpoints.subjects import router as subjects_router
from app.api.v1.endpoints.videos import router as videos_router
from app.api.v1.endpoints.search import router as search_router
from app.api.v1.endpoints.submissions import router as submissions_router
from app.api.v1.endpoints.notes import router as notes_router
from app.api.v1.ingestion import router as ingestion_router
from app.api.v1.stats import router as stats_router

api_router = APIRouter()

# Official Endpoints
api_router.include_router(subjects_router, prefix="/subjects", tags=["Subjects & Syllabus"])
api_router.include_router(videos_router, prefix="/videos", tags=["Videos & Streams"])
api_router.include_router(search_router, prefix="/search", tags=["Semantic Search"])
api_router.include_router(notes_router, prefix="/notes", tags=["AKTU Notes & PYQs"])
api_router.include_router(submissions_router, prefix="/submissions", tags=["Student Submissions"])
api_router.include_router(submissions_router, prefix="/upload", tags=["Upload Alias"])
api_router.include_router(ingestion_router, prefix="/ingestion", tags=["Ingestion & Quota"])
api_router.include_router(stats_router, prefix="/stats", tags=["System Statistics"])

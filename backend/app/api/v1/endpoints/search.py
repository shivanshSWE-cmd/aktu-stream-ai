from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.video import SearchRequest, SearchResponse
from app.services.vector_search import VectorService

router = APIRouter()
vector_service = VectorService()


@router.post("/", response_model=SearchResponse)
async def semantic_search(
    payload: SearchRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Semantic vector search across lecture transcripts and syllabus topics.
    Returns matched segments with timestamp offsets for direct player jumping.
    """
    results = await vector_service.search_transcripts(
        db=db,
        query=payload.query,
        subject_code=payload.subject_code,
        unit_number=payload.unit_number,
        limit=payload.limit,
    )

    return SearchResponse(
        query=payload.query,
        total_results=len(results),
        results=results,
    )

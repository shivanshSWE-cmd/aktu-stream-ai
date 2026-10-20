import json
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()
logger = logging.getLogger("aktu_stream.notes")

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"

# In-memory cache for ultra-fast response
_cache = {}


def load_json_file(filename: str):
    if filename in _cache:
        return _cache[filename]
    file_path = DATA_DIR / filename
    if not file_path.exists():
        logger.warning(f"File not found: {file_path}")
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            _cache[filename] = data
            return data
    except Exception as e:
        logger.error(f"Error loading {filename}: {e}")
        return None


@router.get("/portals")
async def get_portals():
    """Return all categories and portal metadata from the notes store."""
    data = load_json_file("portals.json")
    if not data:
        # Fallback default portals
        return {
            "portals": [
                {"id": "1year", "title": "1st Year Notes", "count": "13 Subjects • 182 Notes", "badge": "1st Year • All Branches", "icon": "📚"},
                {"id": "2ndyear", "title": "2nd Year Notes", "count": "15 Subjects • 881 Notes", "badge": "2nd Year • CSE/IT", "icon": "📝"},
                {"id": "3year", "title": "3rd Year Notes", "count": "34 Subjects • 323 Notes", "badge": "3rd Year • Core", "icon": "💻"},
                {"id": "year4_other", "title": "4th Year Notes", "count": "20 Subjects • 127 Notes", "badge": "4th Year • Electives", "icon": "🎓"},
                {"id": "pyq", "title": "AKTU Solved PYQ Bank", "count": "1,961+ Solved Papers", "badge": "Semesters 1-8", "icon": "📄"},
            ]
        }
    return data


@router.get("/courses")
async def get_courses():
    """Return 28 AKTU video lecture courses from the old website store."""
    data = load_json_file("lectures.json")
    if not data:
        raise HTTPException(status_code=404, detail="Lectures data not found")
    return data


@router.get("/year/{year_id}")
async def get_notes_by_year(year_id: str):
    """Return subject notes and unit-wise downloads for a given year."""
    filename_map = {
        "1year": "year1.json",
        "year1": "year1.json",
        "2ndyear": "year2.json",
        "year2": "year2.json",
        "3year": "year3.json",
        "year3": "year3.json",
        "4year": "year4_other.json",
        "year4": "year4_other.json",
        "year4_other": "year4_other.json",
        "multiatom_year2": "multiatom_year2.json",
        "multiatom_year3": "multiatom_year3.json",
        "multiatom_year4": "multiatom_year4.json",
    }
    filename = filename_map.get(year_id.lower())
    if not filename:
        raise HTTPException(status_code=404, detail=f"Invalid year portal '{year_id}'")

    data = load_json_file(filename)
    if not data:
        raise HTTPException(status_code=404, detail=f"Notes data not found for '{year_id}'")
    return data


@router.get("/pyqs")
async def get_pyqs(
    q: Optional[str] = Query(None, description="Search query by subject code or paper title"),
    semester: Optional[int] = Query(None, description="Semester filter (1-8)"),
    code: Optional[str] = Query(None, description="Exact subject code filter (e.g. BAS101)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(30, ge=1, le=100, description="Items per page"),
):
    """Search and paginate 1,961+ official AKTU university previous year papers."""
    data = load_json_file("pyq_bank.json")
    if not data or "papers" not in data:
        return {"total": 0, "page": page, "limit": limit, "totalPages": 0, "papers": []}

    papers = data["papers"]

    # Filter by semester
    if semester is not None and semester > 0:
        papers = [p for p in papers if p.get("semester") == semester]

    # Filter by code
    if code:
        code_norm = code.strip().upper()
        papers = [p for p in papers if p.get("code", "").upper() == code_norm]

    # Filter by general search query
    if q:
        query_str = q.strip().lower()
        papers = [
            p
            for p in papers
            if query_str in p.get("title", "").lower()
            or query_str in p.get("code", "").lower()
            or query_str in str(p.get("session", "")).lower()
        ]

    total = len(papers)
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    start_idx = (page - 1) * limit
    paginated = papers[start_idx : start_idx + limit]

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": total_pages,
        "papers": paginated,
    }

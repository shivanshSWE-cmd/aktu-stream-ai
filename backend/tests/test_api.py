import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import get_db


@pytest.mark.asyncio
async def test_health_and_root(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

        root_resp = await client.get("/")
        assert root_resp.status_code == 200
        assert root_resp.json()["service"] == "AKTU Stream AI"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_subjects_api(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # List branches
        branch_resp = await client.get("/api/v1/subjects/branches")
        assert branch_resp.status_code == 200
        branches = branch_resp.json()
        assert len(branches) > 0
        assert any(b["code"] == "CSE" for b in branches)

        # List subjects filtered by branch and semester
        subj_resp = await client.get("/api/v1/subjects/?branch_code=CSE&semester=5")
        assert subj_resp.status_code == 200
        subjects = subj_resp.json()
        assert len(subjects) > 0
        assert any(s["code"] == "BCS501" for s in subjects)

        # Get subject detail with 5 units
        detail_resp = await client.get("/api/v1/subjects/BCS501")
        assert detail_resp.status_code == 200
        bcs501 = detail_resp.json()
        assert bcs501["code"] == "BCS501"
        assert len(bcs501["units"]) == 5

        # Get unit 2 detail
        unit2_resp = await client.get("/api/v1/subjects/BCS501/units/2")
        assert unit2_resp.status_code == 200
        unit2 = unit2_resp.json()
        assert unit2["unit_number"] == 2
        assert "Relational" in unit2["title"]

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_ingestion_quota_api(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Check quota status
        quota_resp = await client.get("/api/v1/ingestion/quota")
        assert quota_resp.status_code == 200
        quota_data = quota_resp.json()
        assert quota_data["daily_quota_limit"] == 10000
        assert quota_data["units_used_today"] >= 0
        assert quota_data["is_budget_exceeded"] is False

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_user_watch_progress_api(db_session):
    from app.models.models import Video

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Create dummy video
    test_vid = Video(
        title="DBMS Unit 2 Joins Lecture",
        source_type="YOUTUBE",
        youtube_video_id="dQw4w9WgXcQ",
        duration_seconds=3600,
    )
    db_session.add(test_vid)
    await db_session.commit()
    await db_session.refresh(test_vid)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Update progress
        prog_resp = await client.post(
            f"/api/v1/videos/{test_vid.id}/progress",
            json={
                "session_id": "student_session_101",
                "position_seconds": 1245.5,
                "is_completed": False,
            },
        )
        assert prog_resp.status_code == 200
        prog_data = prog_resp.json()
        assert prog_data["session_id"] == "student_session_101"
        assert prog_data["video_id"] == test_vid.id
        assert prog_data["last_position_seconds"] == 1245.5
        assert prog_data["is_completed"] is False

        # Mark as completed
        completed_resp = await client.post(
            f"/api/v1/videos/{test_vid.id}/progress",
            json={
                "session_id": "student_session_101",
                "position_seconds": 3600.0,
                "is_completed": True,
            },
        )
        assert completed_resp.status_code == 200
        assert completed_resp.json()["is_completed"] is True

        # Fetch all progress for user
        user_progs = await client.get("/api/v1/videos/user/student_session_101/progress")
        assert user_progs.status_code == 200
        records = user_progs.json()
        assert len(records) == 1
        assert records[0]["video_id"] == test_vid.id

    app.dependency_overrides.clear()


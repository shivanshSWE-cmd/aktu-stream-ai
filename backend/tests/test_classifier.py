import pytest
from app.services.classifier_service import HeuristicScreener, TwoStageClassifier
from app.services.taxonomy_service import VALID_SUBJECT_CODES


def test_stage1_screener_approves_academic():
    passes, reason = HeuristicScreener.screen(
        title="AKTU BCS501 DBMS Unit 2 Relational Algebra & Calculus",
        description="GateWay Classes lecture for 5th Semester Computer Science students",
        channel_title="GateWay Classes",
        tags=["AKTU", "DBMS", "Unit 2", "BCS501"],
    )
    assert passes is True
    assert "Passed" in reason


def test_stage1_screener_rejects_gaming():
    passes, reason = HeuristicScreener.screen(
        title="Minecraft Pro Gameplay Episode 45 - Building an Epic Castle",
        description="Check out my funny moments and gameplay tips",
        channel_title="Gamer Zone",
        tags=["minecraft", "gameplay", "funny"],
    )
    assert passes is False
    assert "non-academic indicator" in reason


@pytest.mark.asyncio
async def test_twostage_classifier_schema_and_gatekeeper():
    classifier = TwoStageClassifier()

    # Valid AKTU DBMS video
    result = await classifier.classify_video(
        title="AKTU BCS501 DBMS Unit 2 Relational Algebra & Calculus",
        channel_title="GateWay Classes",
        description="Covers relational algebra, tuple relational calculus, and SQL join queries for AKTU Unit 2 DBMS.",
        tags=["AKTU", "BCS501", "DBMS"],
        transcript_snippet="Welcome students to DBMS Unit 2. Today we will study relational algebra operations...",
        duration_seconds=3600,
    )

    # Verify structured fields
    assert result.is_aktu_or_ai_study is True
    assert result.subject_code in VALID_SUBJECT_CODES
    assert result.subject_code == "BCS501"
    assert 1 <= result.unit_number <= 5
    assert result.unit_number == 2
    assert result.confidence >= 0.70
    assert "relational algebra" in result.summary.lower() or "bcs501" in result.summary.lower()


@pytest.mark.asyncio
async def test_twostage_classifier_rejects_irrelevant_content():
    classifier = TwoStageClassifier()

    result = await classifier.classify_video(
        title="Epic Prank on My Roommate in College Hostel",
        channel_title="Fun Club",
        description="Watch till the end to see his reaction!",
        tags=["prank", "funny", "vlog"],
        transcript_snippet="Hey guys so today we are doing this crazy prank...",
        duration_seconds=600,
    )

    assert result.is_aktu_or_ai_study is False
    assert result.confidence < 0.70
    assert result.rejection_reason is not None

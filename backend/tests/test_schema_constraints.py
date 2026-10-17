import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.models.models import Subject, Unit


@pytest.mark.asyncio
async def test_unit_number_range_constraint(db_session):
    """Enforces 1 <= unit_number <= 5."""
    # Unit 6 should fail check constraint
    invalid_unit = Unit(
        subject_code="BCS501",
        unit_number=6,  # OUT OF BOUNDS
        title="Invalid Unit 6",
        topics=["Invalid Topic"],
    )
    db_session.add(invalid_unit)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()

    # Unit 0 should fail check constraint
    invalid_unit_zero = Unit(
        subject_code="BCS501",
        unit_number=0,  # OUT OF BOUNDS
        title="Invalid Unit 0",
        topics=["Invalid Topic"],
    )
    db_session.add(invalid_unit_zero)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_subject_unit_uniqueness_constraint(db_session):
    """Verify unique constraint on (subject_code, unit_number)."""
    # BCS501 Unit 1 was seeded already
    duplicate_unit = Unit(
        subject_code="BCS501",
        unit_number=1,  # Already exists
        title="Duplicate Unit 1",
        topics=["Duplicate"],
    )
    db_session.add(duplicate_unit)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_all_seeded_units_in_valid_range(db_session):
    """Verify all seeded curriculum units are within 1 to 5."""
    res = await db_session.execute(select(Unit))
    units = res.scalars().all()
    assert len(units) > 0
    for u in units:
        assert 1 <= u.unit_number <= 5

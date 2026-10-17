import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

JSONType = JSON().with_variant(JSONB, "postgresql")


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Branch(Base):
    __tablename__ = "branches"

    code = Column(String(10), primary_key=True)  # CSE, IT, AIML, ECE, EE, ME, CE, ALL
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    subjects = relationship("Subject", back_populates="branch", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    code = Column(String(20), primary_key=True)  # BCS301, BCS501, BAS101, BEE301, AI_GENERAL
    name = Column(String(200), nullable=False)
    branch_code = Column(String(10), ForeignKey("branches.code", ondelete="CASCADE"), nullable=False)
    semester = Column(Integer, nullable=False)
    syllabus_markdown = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        CheckConstraint("semester >= 1 AND semester <= 8", name="check_semester_range"),
    )

    branch = relationship("Branch", back_populates="subjects")
    units = relationship("Unit", back_populates="subject", cascade="all, delete-orphan", order_by="Unit.unit_number")
    classifications = relationship("VideoClassification", back_populates="subject")


class Unit(Base):
    __tablename__ = "units"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    subject_code = Column(String(20), ForeignKey("subjects.code", ondelete="CASCADE"), nullable=False, index=True)
    unit_number = Column(Integer, nullable=False)  # 1 to 5
    title = Column(String(255), nullable=False)
    topics = Column(JSONType, default=list, nullable=False)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        CheckConstraint("unit_number >= 1 AND unit_number <= 5", name="check_unit_number_range"),
        UniqueConstraint("subject_code", "unit_number", name="uq_subject_unit_number"),
    )

    subject = relationship("Subject", back_populates="units")

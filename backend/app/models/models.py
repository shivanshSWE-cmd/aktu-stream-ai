import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
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

# Universal JSON type compatible with SQLite and Postgres
JSONType = JSON().with_variant(JSONB, "postgresql")


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Branch(Base):
    __tablename__ = "branches"

    code = Column(String(10), primary_key=True)  # CSE, IT, AIML, ECE, ME, CE, ALL
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    subjects = relationship("Subject", back_populates="branch", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    code = Column(String(20), primary_key=True)  # BCS301, BCS501, BAS101, AI_GENERAL
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
    topics = Column(JSONType, default=list, nullable=False)  # List of topic strings
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        CheckConstraint("unit_number >= 1 AND unit_number <= 5", name="check_unit_number_range"),
        UniqueConstraint("subject_code", "unit_number", name="uq_subject_unit_number"),
    )

    subject = relationship("Subject", back_populates="units")


class Video(Base):
    __tablename__ = "videos"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    source_type = Column(String(20), nullable=False)  # 'YOUTUBE' or 'NATIVE'
    source_url = Column(Text, nullable=True)
    youtube_video_id = Column(String(50), nullable=True, index=True)
    s3_raw_key = Column(String(500), nullable=True)
    s3_hls_master_url = Column(String(500), nullable=True)
    duration_seconds = Column(Integer, default=0, nullable=False)
    thumbnail_url = Column(Text, nullable=True)
    view_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    classification = relationship("VideoClassification", back_populates="video", uselist=False, cascade="all, delete-orphan")
    transcript = relationship("VideoTranscript", back_populates="video", uselist=False, cascade="all, delete-orphan")


class VideoClassification(Base):
    __tablename__ = "video_classifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    subject_code = Column(String(20), ForeignKey("subjects.code", ondelete="SET NULL"), nullable=True, index=True)
    unit_number = Column(Integer, nullable=True)  # 1 to 5
    is_aktu_or_ai_study = Column(Boolean, default=False, nullable=False)
    confidence = Column(Float, default=0.0, nullable=False)
    status = Column(String(20), default="PENDING", nullable=False, index=True)  # PENDING, APPROVED, REJECTED
    summary = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    topics_covered = Column(JSONType, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "(unit_number IS NULL) OR (unit_number >= 1 AND unit_number <= 5)",
            name="check_classification_unit_range",
        ),
    )

    video = relationship("Video", back_populates="classification")
    subject = relationship("Subject", back_populates="classifications")


class VideoTranscript(Base):
    __tablename__ = "video_transcripts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    language = Column(String(10), default="en", nullable=False)
    full_text = Column(Text, nullable=False)
    segments = Column(JSONType, default=list, nullable=False)  # [{"start": 0.0, "duration": 5.0, "text": "..."}]
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    video = relationship("Video", back_populates="transcript")


class ChannelWhitelist(Base):
    __tablename__ = "channel_whitelists"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    channel_id = Column(String(50), unique=True, nullable=False, index=True)  # e.g., UC...
    uploads_playlist_id = Column(String(50), nullable=False)  # derived UU...
    channel_title = Column(String(200), nullable=False)
    branch_code = Column(String(10), ForeignKey("branches.code", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class QuotaLog(Base):
    __tablename__ = "quota_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    api_type = Column(String(50), default="YOUTUBE_DATA_V3", nullable=False)
    endpoint = Column(String(100), nullable=False)  # playlistItems.list, videos.list
    units_used = Column(Integer, nullable=False)
    details = Column(JSONType, default=dict, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(100), nullable=False, index=True)
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    last_position_seconds = Column(Float, default=0.0, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        UniqueConstraint("session_id", "video_id", name="uq_user_video_progress"),
    )

    video = relationship("Video")


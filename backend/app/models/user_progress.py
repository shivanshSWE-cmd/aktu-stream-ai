import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


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

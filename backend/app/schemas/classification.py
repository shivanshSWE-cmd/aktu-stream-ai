from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict, Field


class ClassificationOutput(BaseModel):
    """Structured output expected from Stage-2 LLM Classifier."""
    is_aktu_or_ai_study: bool = Field(
        ...,
        description="True if video is genuinely aligned with AKTU syllabus or core AI/ML study track"
    )
    subject_code: str = Field(
        ...,
        description="Official AKTU subject code (e.g., BCS301, BCS501, BAS101) or AI_GENERAL"
    )
    unit_number: int = Field(
        ...,
        ge=1,
        le=5,
        description="Unit number strictly from 1 to 5"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.00 and 1.00"
    )
    summary: str = Field(
        ...,
        description="Concise description of academic content covered in the video"
    )
    rejection_reason: Optional[str] = Field(
        default=None,
        description="Detailed explanation if rejected or non-compliant"
    )
    topics_covered: List[str] = Field(
        default_factory=list,
        description="Academic topics covered in this lecture"
    )


class ClassificationResponse(BaseModel):
    id: str
    video_id: str
    subject_code: Optional[str] = None
    unit_number: Optional[int] = None
    is_aktu_or_ai_study: bool
    confidence: float
    status: Literal["PENDING", "APPROVED", "REJECTED"]
    summary: Optional[str] = None
    rejection_reason: Optional[str] = None
    topics_covered: List[str] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

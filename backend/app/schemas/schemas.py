from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


# --- Taxonomy Schemas ---

class UnitBase(BaseModel):
    unit_number: int = Field(..., ge=1, le=5, description="Unit number strictly between 1 and 5")
    title: str = Field(..., min_length=2, max_length=255)
    topics: List[str] = Field(default_factory=list)
    summary: Optional[str] = None


class UnitCreate(UnitBase):
    subject_code: str


class UnitResponse(UnitBase):
    id: str
    subject_code: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SubjectBase(BaseModel):
    code: str = Field(..., min_length=3, max_length=20, pattern=r"^[A-Z0-9_]+$")
    name: str = Field(..., min_length=3, max_length=200)
    branch_code: str = Field(..., min_length=2, max_length=10)
    semester: int = Field(..., ge=1, le=8)
    syllabus_markdown: Optional[str] = None
    is_active: bool = True


class SubjectCreate(SubjectBase):
    pass


class SubjectResponse(SubjectBase):
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SubjectWithUnitsResponse(SubjectResponse):
    units: List[UnitResponse] = []
    model_config = ConfigDict(from_attributes=True)


class BranchResponse(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Classification & Gatekeeper Schemas ---

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


# --- Transcript Schemas ---

class TranscriptSegment(BaseModel):
    start: float = Field(..., ge=0.0)
    duration: float = Field(..., ge=0.0)
    text: str


class TranscriptResponse(BaseModel):
    id: str
    video_id: str
    language: str
    full_text: str
    segments: List[TranscriptSegment] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Video Schemas ---

class VideoBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    source_type: Literal["YOUTUBE", "NATIVE"]


class VideoCreate(VideoBase):
    source_url: Optional[str] = None
    youtube_video_id: Optional[str] = None
    duration_seconds: int = 0
    thumbnail_url: Optional[str] = None


class VideoResponse(VideoBase):
    id: str
    source_url: Optional[str] = None
    youtube_video_id: Optional[str] = None
    s3_hls_master_url: Optional[str] = None
    duration_seconds: int
    thumbnail_url: Optional[str] = None
    view_count: int
    created_at: datetime
    updated_at: datetime
    classification: Optional[ClassificationResponse] = None
    model_config = ConfigDict(from_attributes=True)


class VideoDetailResponse(VideoResponse):
    transcript: Optional[TranscriptResponse] = None
    model_config = ConfigDict(from_attributes=True)


# --- Ingestion & Quota Schemas ---

class ChannelWhitelistCreate(BaseModel):
    channel_id: str = Field(..., description="YouTube Channel ID, must start with UC...")
    channel_title: str
    branch_code: Optional[str] = None

    @field_validator("channel_id")
    @classmethod
    def validate_channel_id(cls, v: str) -> str:
        clean = v.strip()
        if not clean.startswith("UC") or len(clean) < 10:
            raise ValueError("Invalid YouTube Channel ID. Must start with 'UC'.")
        return clean


class ChannelWhitelistResponse(BaseModel):
    id: str
    channel_id: str
    uploads_playlist_id: str
    channel_title: str
    branch_code: Optional[str] = None
    is_active: bool
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class IngestTriggerRequest(BaseModel):
    channel_id: Optional[str] = None
    max_videos: int = Field(default=10, ge=1, le=50)


class IngestJobResult(BaseModel):
    video_id: str
    youtube_id: str
    title: str
    status: Literal["APPROVED", "REJECTED", "ERROR"]
    subject_code: Optional[str] = None
    unit_number: Optional[int] = None
    confidence: float
    reason: Optional[str] = None


class IngestTriggerResponse(BaseModel):
    channel_id: str
    channel_title: str
    videos_fetched: int
    approved_count: int
    rejected_count: int
    quota_units_used: int
    results: List[IngestJobResult] = []


class QuotaStatusResponse(BaseModel):
    daily_quota_limit: int
    units_used_today: int
    units_remaining_today: int
    is_budget_exceeded: bool
    endpoints_breakdown: dict[str, int]


# --- Presigned Upload & Transcode Schemas ---

class PresignedUploadRequest(BaseModel):
    filename: str = Field(..., min_length=1)
    file_size_bytes: int = Field(..., gt=0, le=1024 * 1024 * 1024 * 5)  # Max 5GB
    content_type: Literal["video/mp4"] = "video/mp4"
    title: str
    subject_code: Optional[str] = None
    unit_number: Optional[int] = Field(default=None, ge=1, le=5)


class PresignedUploadResponse(BaseModel):
    video_id: str
    raw_s3_key: str
    upload_url: str
    expires_in_seconds: int = 3600
    headers: dict[str, str] = {}


class UploadCompleteRequest(BaseModel):
    video_id: str
    raw_s3_key: str


class TranscodingStatusResponse(BaseModel):
    video_id: str
    status: Literal["UPLOADING", "PROCESSING", "READY", "FAILED"]
    progress_percentage: int
    hls_master_url: Optional[str] = None
    error_message: Optional[str] = None


# --- Semantic Search Schemas ---

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2)
    branch_code: Optional[str] = None
    subject_code: Optional[str] = None
    unit_number: Optional[int] = Field(default=None, ge=1, le=5)
    limit: int = Field(default=10, ge=1, le=50)


class SearchResultItem(BaseModel):
    video_id: str
    title: str
    thumbnail_url: Optional[str] = None
    subject_code: Optional[str] = None
    unit_number: Optional[int] = None
    snippet: str
    timestamp_seconds: Optional[float] = None
    similarity_score: float


class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResultItem]


# --- User Progress Schemas ---

class UserProgressUpdate(BaseModel):
    session_id: str = Field(..., min_length=1)
    position_seconds: float = Field(default=0.0, ge=0.0)
    is_completed: bool = False


class UserProgressResponse(BaseModel):
    id: str
    session_id: str
    video_id: str
    last_position_seconds: float
    is_completed: bool
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


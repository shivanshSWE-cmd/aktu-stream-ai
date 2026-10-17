from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


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

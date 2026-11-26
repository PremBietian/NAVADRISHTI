
"""CERBERUS-X shared evidence contract. Pydantic v2."""

import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:12].upper()}"


def validate_json_value(value: Any) -> Any:
    try:
        json.dumps(value, ensure_ascii=False, allow_nan=False)
    except (TypeError, ValueError) as exc:
        raise ValueError("Value must be JSON-serializable") from exc
    return value


class CERBERUSModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
        use_enum_values=False,
    )


class EvidenceModality(str, Enum):
    PDF_DOCUMENT = "PDF_DOCUMENT"
    DOCX_DOCUMENT = "DOCX_DOCUMENT"
    IMAGE = "IMAGE"
    SCANNED_DOCUMENT = "SCANNED_DOCUMENT"
    XLSX = "XLSX"
    CSV = "CSV"
    JSON = "JSON"
    TXT = "TXT"
    OTHER = "OTHER"


class VerificationStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    SUPPORTED = "SUPPORTED"
    REFUTED = "REFUTED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    CONFLICTED = "CONFLICTED"


class ClaimPolarity(str, Enum):
    AFFIRMED = "AFFIRMED"
    NEGATED = "NEGATED"


class TimePrecision(str, Enum):
    INSTANT = "INSTANT"
    DATE = "DATE"
    MONTH = "MONTH"
    YEAR = "YEAR"
    UNKNOWN = "UNKNOWN"


class SourceLocation(CERBERUSModel):
    """Where a piece of information was found in its original source."""

    page: int | None = Field(default=None, ge=1)
    paragraph: int | None = Field(default=None, ge=1)
    sheet: str | None = None
    row: int | None = Field(default=None, ge=1)
    column: str | None = None
    image_region: tuple[float, float, float, float] | None = None
    character_start: int | None = Field(default=None, ge=0)
    character_end: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_character_range(self):
        if (
            self.character_start is not None
            and self.character_end is not None
            and self.character_end < self.character_start
        ):
            raise ValueError("character_end cannot be before character_start")
        return self

    @field_validator("image_region")
    @classmethod
    def validate_image_region(cls, value):
        if value is not None:
            x1, y1, x2, y2 = value
            if not (0 <= x1 < x2 and 0 <= y1 < y2):
                raise ValueError(
                    "Image region must satisfy 0 <= x1 < x2 and 0 <= y1 < y2"
                )
        return value


class ExtractedEntity(CERBERUSModel):
    """An entity mentioned in a source, not automatically a verified real-world identity."""

    entity_id: str = Field(default_factory=lambda: new_id("ENT"))
    name: str = Field(min_length=1)
    entity_type: str = Field(default="UNKNOWN", min_length=1)
    value: Any = None
    normalized_name: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)

    @field_validator("value")
    @classmethod
    def check_value(cls, value):
        return validate_json_value(value)

    @field_validator("attributes")
    @classmethod
    def check_attributes(cls, value):
        return validate_json_value(value)


class ExtractedClaim(CERBERUSModel):
    """A claim extracted from a source. Extraction does not establish truth."""

    claim_id: str = Field(default_factory=lambda: new_id("CLM"))

    # Original subject text from the source.
    subject: str = Field(min_length=1)

    # Optional link to a resolved or provisionally linked entity.
    subject_entity_id: str | None = Field(default=None, min_length=1)

    predicate: str = Field(min_length=1)
    object: Any

    polarity: ClaimPolarity = ClaimPolarity.AFFIRMED
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    time_precision: TimePrecision = TimePrecision.UNKNOWN
    source_location: SourceLocation | None = None
    extraction_confidence: float | None = Field(default=None, ge=0, le=1)
    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED

    @field_validator("object")
    @classmethod
    def check_object(cls, value):
        return validate_json_value(value)

    @model_validator(mode="after")
    def validate_validity_period(self):
        if (
            self.valid_from is not None
            and self.valid_until is not None
            and self.valid_until < self.valid_from
        ):
            raise ValueError("valid_until cannot be earlier than valid_from")
        return self


class EvidenceRecord(CERBERUSModel):
    """A source-level evidence record containing extracted entities and claims."""

    evidence_id: str = Field(default_factory=lambda: new_id("EVD"))
    source_name: str = Field(min_length=1)
    modality: EvidenceModality
    source_uri: str | None = None
    source_hash_sha256: str | None = Field(
        default=None,
        pattern=r"^[a-fA-F0-9]{64}$",
    )
    author_provenance: str | None = None
    source_created_at: datetime | None = None
    ingested_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    reliability_score: float | None = Field(default=None, ge=0, le=1)
    extraction_confidence: float | None = Field(default=None, ge=0, le=1)
    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED
    entities: list[ExtractedEntity] = Field(default_factory=list)
    claims: list[ExtractedClaim] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("metadata")
    @classmethod
    def check_metadata(cls, value):
        return validate_json_value(value)

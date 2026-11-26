
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from backend.app.schemas.evidence import (
    EvidenceRecord,
    VerificationStatus,
)
from backend.app.services.evidence_integrity import (
    EvidenceIntegrityEngine,
    IntegrityStatus,
)


@dataclass
class ReliabilityAssessment:
    evidence_id: str
    source_name: str
    score: float | None
    confidence_level: str

    provenance_score: float | None
    verification_score: float | None
    integrity_score: float | None

    extraction_confidence: float | None

    reasons: list[str] = field(default_factory=list)
    limitations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class SourceReliabilityEngine:
    """
    Estimates evidence-source reliability using available signals.

    Reliability is a heuristic assessment, not proof that a source
    or its claims are truthful.

    Integrity is scored only when the original file has been
    checked against its recorded SHA-256 fingerprint.
    """

    WEIGHTS = {
        "provenance": 0.40,
        "verification": 0.40,
        "integrity": 0.20,
    }

    VERIFICATION_SCORES = {
        VerificationStatus.SUPPORTED: 1.0,
        VerificationStatus.REFUTED: 0.0,
        VerificationStatus.CONFLICTED: 0.0,
    }

    def __init__(self) -> None:
        self.integrity_engine = EvidenceIntegrityEngine()

    @staticmethod
    def _assess_provenance(
        record: EvidenceRecord,
    ) -> tuple[float | None, list[str], list[str]]:

        score = 0.0
        available = False
        reasons = []
        limitations = []

        if record.author_provenance:
            score += 0.5
            available = True
            reasons.append("Author or origin information is recorded.")
        else:
            limitations.append("Author or origin information is missing.")

        if record.source_uri:
            score += 0.5
            available = True
            reasons.append("Source location information is recorded.")
        else:
            limitations.append("Source location information is missing.")

        if not available:
            return None, reasons, limitations

        return score, reasons, limitations

    @staticmethod
    def _assess_verification(
        record: EvidenceRecord,
    ) -> tuple[float | None, list[str], list[str]]:

        status = record.verification_status

        if status in SourceReliabilityEngine.VERIFICATION_SCORES:
            score = SourceReliabilityEngine.VERIFICATION_SCORES[status]

            return (
                score,
                [f"Evidence verification status is {status.value}."],
                [],
            )

        return (
            None,
            [],
            [
                f"Verification status {status.value} does not provide "
                "a reliability score."
            ],
        )

    @staticmethod
    def _assess_integrity(
        record: EvidenceRecord,
        integrity_result: Any = None,
    ) -> tuple[float | None, list[str], list[str]]:

        if integrity_result is None:
            return (
                None,
                [],
                [
                    "File integrity has not been independently verified. "
                    "A recorded hash alone is not sufficient."
                ],
            )

        if integrity_result.evidence_id != record.evidence_id:
            return (
                None,
                [],
                ["Integrity result belongs to a different evidence record."],
            )

        if integrity_result.status == IntegrityStatus.VERIFIED:
            return (
                1.0,
                ["SHA-256 fingerprint matches the original recorded hash."],
                [],
            )

        if integrity_result.status == IntegrityStatus.MODIFIED:
            return (
                0.0,
                ["SHA-256 fingerprint mismatch: file modification detected."],
                [],
            )

        return (
            None,
            [],
            [
                "Integrity could not be verified: "
                f"{integrity_result.status.value}."
            ],
        )

    def assess(
        self,
        record: EvidenceRecord,
        file_path: str | Path | None = None,
    ) -> ReliabilityAssessment:

        reasons: list[str] = []
        limitations: list[str] = []

        provenance_score, provenance_reasons, provenance_limits = (
            self._assess_provenance(record)
        )

        verification_score, verification_reasons, verification_limits = (
            self._assess_verification(record)
        )

        integrity_result = None

        if file_path is not None:
            integrity_result = self.integrity_engine.verify_record(
                record,
                file_path,
            )

        integrity_score, integrity_reasons, integrity_limits = (
            self._assess_integrity(record, integrity_result)
        )

        reasons.extend(provenance_reasons)
        reasons.extend(verification_reasons)
        reasons.extend(integrity_reasons)

        limitations.extend(provenance_limits)
        limitations.extend(verification_limits)
        limitations.extend(integrity_limits)

        signals = [
            (provenance_score, self.WEIGHTS["provenance"]),
            (verification_score, self.WEIGHTS["verification"]),
            (integrity_score, self.WEIGHTS["integrity"]),
        ]

        weighted_total = 0.0
        available_weight = 0.0

        for score, weight in signals:
            if score is not None:
                weighted_total += score * weight
                available_weight += weight

        if available_weight == 0:
            final_score = None
            confidence_level = "UNKNOWN"

        else:
            final_score = round(
                weighted_total / available_weight,
                4,
            )

            if available_weight < 0.50:
                confidence_level = "LOW_DATA"
            elif final_score >= 0.80:
                confidence_level = "HIGH"
            elif final_score >= 0.50:
                confidence_level = "MODERATE"
            else:
                confidence_level = "LOW"

        if record.extraction_confidence is not None:
            reasons.append(
                "Extraction confidence is reported separately and "
                "does not increase source reliability."
            )

        limitations.append(
            "Reliability scores are heuristic and do not establish "
            "the truth or authenticity of evidence."
        )

        return ReliabilityAssessment(
            evidence_id=record.evidence_id,
            source_name=record.source_name,
            score=final_score,
            confidence_level=confidence_level,
            provenance_score=provenance_score,
            verification_score=verification_score,
            integrity_score=integrity_score,
            extraction_confidence=record.extraction_confidence,
            reasons=reasons,
            limitations=limitations,
        )

    def assess_many(
        self,
        records: list[EvidenceRecord],
        file_paths: dict[str, str | Path] | None = None,
    ) -> list[ReliabilityAssessment]:

        file_paths = file_paths or {}

        return [
            self.assess(
                record,
                file_path=file_paths.get(record.evidence_id),
            )
            for record in records
        ]

    @staticmethod
    def get_summary(
        assessments: list[ReliabilityAssessment],
    ) -> dict[str, Any]:

        scores = [
            assessment.score
            for assessment in assessments
            if assessment.score is not None
        ]

        return {
            "total_sources": len(assessments),
            "scored_sources": len(scores),
            "unscored_sources": len(assessments) - len(scores),
            "average_reliability": (
                round(sum(scores) / len(scores), 4)
                if scores
                else None
            ),
            "high": sum(
                a.confidence_level == "HIGH" for a in assessments
            ),
            "moderate": sum(
                a.confidence_level == "MODERATE" for a in assessments
            ),
            "low": sum(
                a.confidence_level == "LOW" for a in assessments
            ),
            "low_data": sum(
                a.confidence_level == "LOW_DATA" for a in assessments
            ),
            "unknown": sum(
                a.confidence_level == "UNKNOWN" for a in assessments
            ),
        }

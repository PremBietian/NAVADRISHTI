
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional

from backend.app.schemas.evidence import ExtractedClaim


class TemporalRelation(str, Enum):
    SAME_PERIOD = "SAME_PERIOD"
    OVERLAPPING = "OVERLAPPING"
    BEFORE = "BEFORE"
    AFTER = "AFTER"
    UNKNOWN = "UNKNOWN"


@dataclass
class TemporalAssessment:
    claim_a_id: str
    claim_b_id: str
    relation: TemporalRelation
    periods_compatible: bool
    explanation: str

    def to_dict(self) -> dict:
        return {
            "claim_a_id": self.claim_a_id,
            "claim_b_id": self.claim_b_id,
            "relation": self.relation.value,
            "periods_compatible": self.periods_compatible,
            "explanation": self.explanation,
        }


class TemporalReasoningEngine:
    """
    Compares the time periods associated with two claims.

    Missing dates are treated as unknown, not as proof that
    two claims are contemporaneous.
    """

    @staticmethod
    def _get_start(claim: ExtractedClaim) -> Optional[datetime]:
        return claim.valid_from

    @staticmethod
    def _get_end(claim: ExtractedClaim) -> Optional[datetime]:
        return claim.valid_until or claim.valid_from

    def compare(
        self,
        claim_a: ExtractedClaim,
        claim_b: ExtractedClaim,
    ) -> TemporalAssessment:

        start_a = self._get_start(claim_a)
        end_a = self._get_end(claim_a)

        start_b = self._get_start(claim_b)
        end_b = self._get_end(claim_b)

        if (
            start_a is None
            or start_b is None
            or end_a is None
            or end_b is None
        ):
            return TemporalAssessment(
                claim_a_id=claim_a.claim_id,
                claim_b_id=claim_b.claim_id,
                relation=TemporalRelation.UNKNOWN,
                periods_compatible=True,
                explanation=(
                    "At least one claim has incomplete temporal "
                    "information. A temporal conflict cannot be "
                    "established."
                ),
            )

        # Avoid comparing naive and timezone-aware dates directly.
        aware_a = start_a.tzinfo is not None
        aware_b = start_b.tzinfo is not None

        if aware_a != aware_b:
            return TemporalAssessment(
                claim_a_id=claim_a.claim_id,
                claim_b_id=claim_b.claim_id,
                relation=TemporalRelation.UNKNOWN,
                periods_compatible=True,
                explanation=(
                    "The claims use incompatible timezone information. "
                    "Temporal comparison was deferred."
                ),
            )

        if end_a < start_b:
            relation = TemporalRelation.BEFORE
            compatible = False
            explanation = (
                "Claim A's period ends before Claim B's period begins."
            )

        elif end_b < start_a:
            relation = TemporalRelation.AFTER
            compatible = False
            explanation = (
                "Claim A's period begins after Claim B's period ends."
            )

        elif start_a == start_b and end_a == end_b:
            relation = TemporalRelation.SAME_PERIOD
            compatible = True
            explanation = (
                "Both claims describe the same time period."
            )

        else:
            relation = TemporalRelation.OVERLAPPING
            compatible = True
            explanation = (
                "The time periods overlap."
            )

        return TemporalAssessment(
            claim_a_id=claim_a.claim_id,
            claim_b_id=claim_b.claim_id,
            relation=relation,
            periods_compatible=compatible,
            explanation=explanation,
        )

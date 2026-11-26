
from dataclasses import dataclass, field
from typing import Optional

from backend.app.schemas.evidence import (
    EvidenceRecord,
    VerificationStatus,
)

from backend.app.reasoning.contradiction_engine import (
    ContradictionEngine,
    ConflictType,
)


@dataclass
class ClaimVerificationResult:
    """Verification assessment for one extracted claim."""

    claim_id: str
    evidence_id: str
    source_name: str
    subject: str
    predicate: str
    claimed_value: object
    status: VerificationStatus

    supporting_evidence_ids: list[str] = field(default_factory=list)
    conflicting_evidence_ids: list[str] = field(default_factory=list)

    explanation: str = ""
    limitations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "claim_id": self.claim_id,
            "evidence_id": self.evidence_id,
            "source_name": self.source_name,
            "subject": self.subject,
            "predicate": self.predicate,
            "claimed_value": self.claimed_value,
            "status": self.status.value,
            "supporting_evidence_ids": self.supporting_evidence_ids,
            "conflicting_evidence_ids": self.conflicting_evidence_ids,
            "explanation": self.explanation,
            "limitations": self.limitations,
        }


class EvidenceVerificationEngine:
    """
    Evaluates claims against comparable claims from other evidence records.

    Important:
    - Agreement provides corroboration.
    - Disagreement creates a conflict.
    - Disagreement alone does not prove which claim is false.
    - The engine does not automatically select a winning source.
    - The original evidence records are not modified.
    """

    def __init__(self):
        self.contradiction_engine = ContradictionEngine()

    def verify(
        self,
        records: list[EvidenceRecord],
    ) -> list[ClaimVerificationResult]:

        claim_references = {}

        # Collect every claim and its original evidence source.
        for record in records:
            for claim in record.claims:
                claim_references[claim.claim_id] = {
                    "claim": claim,
                    "evidence_id": record.evidence_id,
                    "source_name": record.source_name,
                }

        # Prepare comparison results for every claim.
        assessments = {}

        for claim_id, reference in claim_references.items():
            assessments[claim_id] = {
                "supporting": [],
                "conflicting": [],
            }

        # Reuse the contradiction engine for evidence comparisons.
        comparisons = self.contradiction_engine.analyze(records)

        for comparison in comparisons:

            claim_a_id = comparison.claim_a_id
            claim_b_id = comparison.claim_b_id

            if (
                claim_a_id not in assessments
                or claim_b_id not in assessments
            ):
                continue

            evidence_a_id = comparison.evidence_a_id
            evidence_b_id = comparison.evidence_b_id

            if comparison.conflict_type == ConflictType.AGREEMENT:

                # Claim A is corroborated by evidence B.
                if evidence_b_id not in assessments[claim_a_id]["supporting"]:
                    assessments[claim_a_id]["supporting"].append(
                        evidence_b_id
                    )

                # Claim B is corroborated by evidence A.
                if evidence_a_id not in assessments[claim_b_id]["supporting"]:
                    assessments[claim_b_id]["supporting"].append(
                        evidence_a_id
                    )

            elif comparison.conflict_type in (
                ConflictType.VALUE_CONFLICT,
                ConflictType.POLARITY_CONFLICT,
            ):

                # Neither side is automatically declared false.
                # Both claims are marked as having conflicting evidence.
                if evidence_b_id not in assessments[claim_a_id]["conflicting"]:
                    assessments[claim_a_id]["conflicting"].append(
                        evidence_b_id
                    )

                if evidence_a_id not in assessments[claim_b_id]["conflicting"]:
                    assessments[claim_b_id]["conflicting"].append(
                        evidence_a_id
                    )

        results = []

        for claim_id, reference in claim_references.items():

            claim = reference["claim"]
            evidence_id = reference["evidence_id"]
            source_name = reference["source_name"]

            supporting = assessments[claim_id]["supporting"]
            conflicting = assessments[claim_id]["conflicting"]

            limitations = [
                "Verification is based on comparable claims in the supplied evidence records.",
                "Agreement does not independently prove that a claim is true.",
                "A disagreement does not establish which source is incorrect.",
            ]

            if supporting and conflicting:
                status = VerificationStatus.CONFLICTED
                explanation = (
                    "Some evidence agrees with this claim, while other "
                    "evidence conflicts with it. Further investigation "
                    "is required."
                )

            elif conflicting:
                status = VerificationStatus.CONFLICTED
                explanation = (
                    "Other evidence contains a conflicting claim. "
                    "The available comparison does not establish "
                    "which claim is correct."
                )

            elif supporting:
                status = VerificationStatus.SUPPORTED
                explanation = (
                    "At least one independent evidence record contains "
                    "a comparable claim that agrees with this claim. "
                    "This is corroboration, not proof of truth."
                )

            else:
                status = VerificationStatus.INSUFFICIENT_EVIDENCE
                explanation = (
                    "No comparable claim from another evidence record "
                    "was found. There is not enough evidence to verify "
                    "this claim."
                )

            results.append(
                ClaimVerificationResult(
                    claim_id=claim_id,
                    evidence_id=evidence_id,
                    source_name=source_name,
                    subject=claim.subject,
                    predicate=claim.predicate,
                    claimed_value=claim.object,
                    status=status,
                    supporting_evidence_ids=supporting,
                    conflicting_evidence_ids=conflicting,
                    explanation=explanation,
                    limitations=limitations,
                )
            )

        return results

    @staticmethod
    def get_summary(
        results: list[ClaimVerificationResult],
    ) -> dict:

        summary = {
            "total_claims": len(results),
            "supported": 0,
            "refuted": 0,
            "conflicted": 0,
            "insufficient_evidence": 0,
        }

        for result in results:

            if result.status == VerificationStatus.SUPPORTED:
                summary["supported"] += 1

            elif result.status == VerificationStatus.REFUTED:
                summary["refuted"] += 1

            elif result.status == VerificationStatus.CONFLICTED:
                summary["conflicted"] += 1

            elif result.status == VerificationStatus.INSUFFICIENT_EVIDENCE:
                summary["insufficient_evidence"] += 1

        return summary

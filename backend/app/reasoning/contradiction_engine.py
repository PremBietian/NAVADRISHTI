
"""
CERBERUS-X: Entity-aware Contradiction Detection Engine.

Features:
- Cross-source claim comparison.
- Entity-resolution-aware subject matching.
- Claim normalization integration.
- Temporal reasoning integration.
- Missing-value protection.
- Agreement and contradiction classification.
- Source reliability integration.
- Traceable source assessments.
- Original claim preservation.

Important:
Source reliability is not proof that a claim is true.
The engine never automatically selects a winning source.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional
import re

from backend.app.schemas.evidence import (
    EvidenceRecord,
    ExtractedClaim,
)

from backend.app.graph.entity_resolution import (
    ResolutionDecision,
    resolve_records,
)

from backend.app.reasoning.source_reliability import (
    SourceReliabilityEngine,
)

from backend.app.reasoning.claim_normalization import (
    ClaimNormalizationEngine,
)

from backend.app.reasoning.temporal_reasoning import (
    TemporalReasoningEngine,
    TemporalRelation,
)


class ConflictType(str, Enum):
    VALUE_CONFLICT = "VALUE_CONFLICT"
    POLARITY_CONFLICT = "POLARITY_CONFLICT"
    AGREEMENT = "AGREEMENT"
    NOT_COMPARABLE = "NOT_COMPARABLE"


@dataclass
class ClaimReference:
    claim: ExtractedClaim
    evidence_id: str
    source_name: str
    modality: str


@dataclass
class ConflictResult:
    conflict_id: str
    conflict_type: ConflictType
    claim_a_id: str
    claim_b_id: str
    evidence_a_id: str
    evidence_b_id: str
    source_a: str
    source_b: str
    subject: str
    predicate: str
    value_a: Any
    value_b: Any
    explanation: str

    # None means no calibrated confidence score is available.
    confidence: Optional[float] = None

    metadata: dict[str, Any] = field(default_factory=dict)


def normalize_text(value: Any) -> str:
    """Normalize text for conservative comparison."""

    if value is None:
        return ""

    text = str(value).strip().casefold()
    return re.sub(r"\s+", " ", text)


def normalize_predicate(predicate: str) -> str:
    """Normalize predicate names using the shared normalization engine."""

    return ClaimNormalizationEngine().normalize_predicate(predicate)


def values_equal(value_a: Any, value_b: Any) -> bool:
    """Compare already-normalized values safely."""

    if value_a is None or value_b is None:
        return False

    if isinstance(value_a, bool) or isinstance(value_b, bool):
        return (
            isinstance(value_a, bool)
            and isinstance(value_b, bool)
            and value_a == value_b
        )

    if isinstance(value_a, (int, float)) and isinstance(
        value_b, (int, float)
    ):
        return value_a == value_b

    return normalize_text(value_a) == normalize_text(value_b)


def time_periods_compatible(
    claim_a: ExtractedClaim,
    claim_b: ExtractedClaim,
) -> bool:
    """
    Backward-compatible temporal helper.

    The dedicated TemporalReasoningEngine performs the actual comparison.
    """

    assessment = TemporalReasoningEngine().compare(
        claim_a,
        claim_b,
    )

    return assessment.periods_compatible


def subjects_match(
    claim_a: ExtractedClaim,
    claim_b: ExtractedClaim,
    subjects_resolved_same_entity: bool = False,
) -> bool:
    """
    Decide whether two claims refer to the same subject.

    Explicit entity IDs take priority over matching names.
    Different explicit IDs require a MATCHED entity-resolution result.
    """

    entity_a = claim_a.subject_entity_id
    entity_b = claim_b.subject_entity_id

    if entity_a and entity_b:
        if entity_a == entity_b:
            return True

        return subjects_resolved_same_entity

    # Backward-compatible matching for claims without two IDs.
    return (
        normalize_text(claim_a.subject)
        == normalize_text(claim_b.subject)
        and bool(normalize_text(claim_a.subject))
    )


def compare_claims(
    reference_a: ClaimReference,
    reference_b: ClaimReference,
    subjects_resolved_same_entity: bool = False,
    normalization_engine: Optional[ClaimNormalizationEngine] = None,
    temporal_engine: Optional[TemporalReasoningEngine] = None,
) -> Optional[ConflictResult]:
    """
    Compare two claims after normalization and temporal assessment.

    Original values remain in the returned ConflictResult.
    """

    claim_a = reference_a.claim
    claim_b = reference_b.claim

    # STEP 1: Check whether the claims refer to the same subject.
    if not subjects_match(
        claim_a,
        claim_b,
        subjects_resolved_same_entity,
    ):
        return None

    # STEP 2: Normalize both claims without modifying the originals.
    normalizer = (
        normalization_engine
        if normalization_engine is not None
        else ClaimNormalizationEngine()
    )

    normalized_a = normalizer.normalize(claim_a)
    normalized_b = normalizer.normalize(claim_b)

    predicate_a = normalized_a.normalized_predicate
    predicate_b = normalized_b.normalized_predicate

    if not predicate_a or predicate_a != predicate_b:
        return None

    # STEP 3: Compare the claim time periods.
    temporal = (
        temporal_engine
        if temporal_engine is not None
        else TemporalReasoningEngine()
    )

    temporal_assessment = temporal.compare(
        claim_a,
        claim_b,
    )

    # Clearly separated periods are not compared as contradictions.
    if not temporal_assessment.periods_compatible:
        return None

    # STEP 4: Keep original values for traceability.
    original_value_a = claim_a.object
    original_value_b = claim_b.object

    # Use normalized values for comparison.
    comparison_value_a = normalized_a.normalized_object
    comparison_value_b = normalized_b.normalized_object

    polarity_a = claim_a.polarity
    polarity_b = claim_b.polarity

    # STEP 5: Classify the comparison.
    if (
        comparison_value_a is None
        or comparison_value_b is None
    ):
        conflict_type = ConflictType.NOT_COMPARABLE

        explanation = (
            "At least one claim has a missing value. "
            "There is insufficient information to compare them."
        )

        comparison_status = "INSUFFICIENT_VALUE"

    elif (
        polarity_a != polarity_b
        and values_equal(
            comparison_value_a,
            comparison_value_b,
        )
    ):
        conflict_type = ConflictType.POLARITY_CONFLICT

        explanation = (
            "The claims describe the same subject, property "
            "and normalized value but have opposite "
            "affirmation/negation."
        )

        comparison_status = "POLARITY_CONFLICT"

    elif (
        polarity_a == polarity_b
        and not values_equal(
            comparison_value_a,
            comparison_value_b,
        )
    ):
        conflict_type = ConflictType.VALUE_CONFLICT

        explanation = (
            "The claims describe the same subject and normalized "
            "property but provide different values."
        )

        comparison_status = "VALUE_CONFLICT"

    elif (
        polarity_a == polarity_b
        and values_equal(
            comparison_value_a,
            comparison_value_b,
        )
    ):
        conflict_type = ConflictType.AGREEMENT

        explanation = (
            "Both claims report equivalent normalized values "
            "with the same polarity."
        )

        comparison_status = "AGREEMENT"

    else:
        conflict_type = ConflictType.NOT_COMPARABLE

        explanation = (
            "The claim values or polarity could not be safely compared."
        )

        comparison_status = "UNSAFE_COMPARISON"

    # STEP 6: Return the comparison with complete traceability.
    return ConflictResult(
        conflict_id=f"CNF-{claim_a.claim_id}-{claim_b.claim_id}",
        conflict_type=conflict_type,
        claim_a_id=claim_a.claim_id,
        claim_b_id=claim_b.claim_id,
        evidence_a_id=reference_a.evidence_id,
        evidence_b_id=reference_b.evidence_id,
        source_a=reference_a.source_name,
        source_b=reference_b.source_name,
        subject=claim_a.subject,
        predicate=claim_a.predicate,

        # Original values, not normalized replacements.
        value_a=original_value_a,
        value_b=original_value_b,

        explanation=explanation,

        metadata={
            "source_a_modality": reference_a.modality,
            "source_b_modality": reference_b.modality,

            "entity_a_id": claim_a.subject_entity_id,
            "entity_b_id": claim_b.subject_entity_id,
            "entity_resolution_used": subjects_resolved_same_entity,

            "comparison_status": comparison_status,

            "normalization": {
                "original_predicate_a": claim_a.predicate,
                "original_predicate_b": claim_b.predicate,
                "normalized_predicate": predicate_a,

                "original_value_a": original_value_a,
                "original_value_b": original_value_b,

                "normalized_value_a": comparison_value_a,
                "normalized_value_b": comparison_value_b,

                "notes_a": normalized_a.normalization_notes,
                "notes_b": normalized_b.normalization_notes,
            },

            "temporal_assessment": temporal_assessment.to_dict(),
        },
    )


def collect_claim_references(
    records: list[EvidenceRecord],
) -> list[ClaimReference]:
    """Collect claims with their original source information."""

    references = []

    for record in records:
        for claim in record.claims:
            references.append(
                ClaimReference(
                    claim=claim,
                    evidence_id=record.evidence_id,
                    source_name=record.source_name,
                    modality=record.modality.value,
                )
            )

    return references


class ContradictionEngine:
    """
    Entity-aware contradiction detection with normalization,
    temporal reasoning and source reliability context.
    """

    def __init__(self):
        self.reliability_engine = SourceReliabilityEngine()
        self.normalization_engine = ClaimNormalizationEngine()
        self.temporal_engine = TemporalReasoningEngine()

    def analyze(
        self,
        records: list[EvidenceRecord],
    ) -> list[ConflictResult]:

        references = collect_claim_references(records)
        results = []

        # STEP 1: Assess each evidence source exactly once.
        reliability_assessments = (
            self.reliability_engine.assess_many(records)
        )

        reliability_by_evidence_id = {
            assessment.evidence_id: assessment.to_dict()
            for assessment in reliability_assessments
        }

        # STEP 2: Resolve entities across evidence records.
        resolution_results = resolve_records(records)

        matched_entity_pairs = {
            frozenset((
                result.first_entity_id,
                result.second_entity_id,
            ))
            for result in resolution_results
            if result.decision == ResolutionDecision.MATCHED
        }

        # STEP 3: Compare claims from different evidence records.
        for index, reference_a in enumerate(references):

            for reference_b in references[index + 1:]:

                # Do not compare claims from the same evidence record.
                if reference_a.evidence_id == reference_b.evidence_id:
                    continue

                entity_a = reference_a.claim.subject_entity_id
                entity_b = reference_b.claim.subject_entity_id

                resolved_match = False

                if entity_a and entity_b and entity_a != entity_b:
                    resolved_match = (
                        frozenset((entity_a, entity_b))
                        in matched_entity_pairs
                    )

                result = compare_claims(
                    reference_a,
                    reference_b,
                    subjects_resolved_same_entity=resolved_match,
                    normalization_engine=self.normalization_engine,
                    temporal_engine=self.temporal_engine,
                )

                if result is None:
                    continue

                # STEP 4: Attach both source reliability assessments.
                result.metadata["source_reliability"] = {
                    "source_a": reliability_by_evidence_id.get(
                        reference_a.evidence_id
                    ),
                    "source_b": reliability_by_evidence_id.get(
                        reference_b.evidence_id
                    ),
                }

                # STEP 5: Explain reliability limitations.
                result.metadata["reliability_interpretation"] = (
                    "Reliability assessments provide source-quality "
                    "context only. They do not prove claim truth "
                    "or automatically select a winning source."
                )

                results.append(result)

        return results

    def get_summary(
        self,
        results: list[ConflictResult],
    ) -> dict:

        summary = {
            "total_results": len(results),
            "agreements": 0,
            "value_conflicts": 0,
            "polarity_conflicts": 0,
            "not_comparable": 0,
        }

        for result in results:

            if result.conflict_type == ConflictType.AGREEMENT:
                summary["agreements"] += 1

            elif result.conflict_type == ConflictType.VALUE_CONFLICT:
                summary["value_conflicts"] += 1

            elif result.conflict_type == ConflictType.POLARITY_CONFLICT:
                summary["polarity_conflicts"] += 1

            elif result.conflict_type == ConflictType.NOT_COMPARABLE:
                summary["not_comparable"] += 1

        return summary

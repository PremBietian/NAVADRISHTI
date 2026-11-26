
from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Any

from backend.app.schemas.evidence import EvidenceRecord, ExtractedEntity


class ResolutionDecision(str, Enum):
    MATCHED = "MATCHED"
    DISTINCT = "DISTINCT"
    UNCERTAIN = "UNCERTAIN"


@dataclass
class EntityReference:
    entity_id: str
    evidence_id: str
    name: str
    entity_type: str
    attributes: dict[str, Any]


@dataclass
class ResolutionResult:
    first_entity_id: str
    second_entity_id: str
    first_evidence_id: str
    second_evidence_id: str
    decision: ResolutionDecision
    matching_score: float
    matching_reasons: list[str]


def normalize_name(value: Any) -> str:
    """Normalize ordinary names and descriptive text."""
    if value is None:
        return ""

    text = str(value).casefold().strip()
    return re.sub(r"[^a-z0-9]", "", text)


def normalize_identifier(key: str, value: Any) -> str:
    """
    Normalize identifiers without destroying meaningful punctuation.

    Emails retain @ and dots.
    Phone numbers retain a leading country-code plus sign.
    Other IDs retain their internal punctuation.
    """
    if value is None:
        return ""

    text = str(value).strip().casefold()
    normalized_key = key.casefold().strip()

    if normalized_key in {"email", "email_address"}:
        return text

    if normalized_key in {"phone", "phone_number", "mobile"}:
        digits = re.sub(r"\D", "", text)
        return ("+" if text.startswith("+") else "") + digits

    if normalized_key in {
        "passport_number",
        "employee_id",
        "customer_id",
        "national_id",
        "government_id",
    }:
        return text

    return normalize_name(text)


STRONG_IDENTIFIER_KEYS = {
    "email",
    "email_address",
    "phone",
    "phone_number",
    "mobile",
    "passport_number",
    "employee_id",
    "customer_id",
    "national_id",
    "government_id",
}

IDENTITY_ATTRIBUTE_KEYS = STRONG_IDENTIFIER_KEYS | {
    "date_of_birth",
    "dob",
    "birth_date",
    "full_name",
}


def similarity_score(first: str, second: str) -> float:
    """Calculate a simple character-based similarity score."""
    first = normalize_name(first)
    second = normalize_name(second)

    if not first or not second:
        return 0.0

    if first == second:
        return 1.0

    previous = list(range(len(second) + 1))

    for i, char_a in enumerate(first, start=1):
        current = [i]

        for j, char_b in enumerate(second, start=1):
            cost = 0 if char_a == char_b else 1

            current.append(
                min(
                    current[j - 1] + 1,
                    previous[j] + 1,
                    previous[j - 1] + cost,
                )
            )

        previous = current

    distance = previous[-1]
    return round(
        1 - distance / max(len(first), len(second)),
        4,
    )


def _normalized_attributes(
    attributes: dict[str, Any],
) -> dict[str, str]:
    """Normalize attributes using their meaning and data type."""
    result = {}

    for key, value in attributes.items():
        if value is None or isinstance(value, (dict, list, tuple, set)):
            continue

        normalized_key = str(key).casefold().strip()
        normalized_value = normalize_identifier(
            normalized_key,
            value,
        )

        if normalized_value:
            result[normalized_key] = normalized_value

    return result


def compare_entities(
    first: EntityReference,
    second: EntityReference,
) -> ResolutionResult:
    """
    Compare two entity references.

    A MATCHED decision means the available evidence supports a match.
    It is not a guarantee of identity or a calibrated probability.
    """

    reasons: list[str] = []
    first_type = normalize_name(first.entity_type)
    second_type = normalize_name(second.entity_type)

    name_score = similarity_score(first.name, second.name)

    first_attributes = _normalized_attributes(first.attributes)
    second_attributes = _normalized_attributes(second.attributes)

    shared_keys = set(first_attributes) & set(second_attributes)

    strong_matches = []
    strong_conflicts = []
    other_matches = []
    other_conflicts = []

    # Different known entity types must not be matched.
    if first_type and second_type and first_type != second_type:
        reasons.append(
            f"Entity type mismatch: {first.entity_type} vs "
            f"{second.entity_type}"
        )

        return ResolutionResult(
            first.entity_id,
            second.entity_id,
            first.evidence_id,
            second.evidence_id,
            ResolutionDecision.DISTINCT,
            0.0,
            reasons,
        )

    # Compare shared attributes.
    for key in sorted(shared_keys):
        first_value = first_attributes[key]
        second_value = second_attributes[key]

        if key in STRONG_IDENTIFIER_KEYS:
            if first_value == second_value:
                strong_matches.append(key)
            else:
                strong_conflicts.append(key)

        elif key in IDENTITY_ATTRIBUTE_KEYS:
            if first_value == second_value:
                other_matches.append(key)
            else:
                other_conflicts.append(key)

    # Conflicting strong identifiers are a strong reason to keep
    # the records separate.
    if strong_conflicts:
        reasons.append(
            "Conflicting strong identifiers: "
            + ", ".join(strong_conflicts)
        )

        return ResolutionResult(
            first.entity_id,
            second.entity_id,
            first.evidence_id,
            second.evidence_id,
            ResolutionDecision.DISTINCT,
            0.0,
            reasons,
        )

    # A matching identifier cannot override conflicting identity
    # attributes such as date of birth.
    if other_conflicts:
        reasons.append(
            "Conflicting identity attributes: "
            + ", ".join(other_conflicts)
        )

        return ResolutionResult(
            first.entity_id,
            second.entity_id,
            first.evidence_id,
            second.evidence_id,
            ResolutionDecision.UNCERTAIN,
            round(name_score * 0.5, 4),
            reasons,
        )

    if strong_matches:
        reasons.append(
            "Matching strong identifiers: "
            + ", ".join(strong_matches)
        )

        reasons.append(f"Name similarity: {name_score:.2f}")

        # Avoid automatically matching records with very different
        # names even when an identifier is shared.
        if name_score < 0.55 and not other_matches:
            reasons.append(
                "Shared identifier but insufficient name agreement"
            )

            decision = ResolutionDecision.UNCERTAIN
            score = round(name_score * 0.75, 4)
        else:
            if other_matches:
                reasons.append(
                    "Additional matching attributes: "
                    + ", ".join(other_matches)
                )

            decision = ResolutionDecision.MATCHED
            score = round(
                min(
                    0.99,
                    0.75 + (0.15 * name_score)
                    + (0.03 * min(len(strong_matches), 2))
                    + (0.02 if other_matches else 0),
                ),
                4,
            )

        return ResolutionResult(
            first.entity_id,
            second.entity_id,
            first.evidence_id,
            second.evidence_id,
            decision,
            score,
            reasons,
        )

    # Without a strong identifier, a name alone is not enough
    # to establish identity.
    if name_score >= 0.92 and other_matches:
        reasons.append(f"Very high name similarity: {name_score:.2f}")
        reasons.append(
            "Matching identity attributes: "
            + ", ".join(other_matches)
        )

        decision = ResolutionDecision.MATCHED
        score = round(min(0.90, 0.65 + name_score * 0.20), 4)

    elif name_score >= 0.55:
        reasons.append(f"Name similarity: {name_score:.2f}")
        reasons.append(
            "Insufficient independent identifiers for automatic matching"
        )

        decision = ResolutionDecision.UNCERTAIN
        score = round(name_score * 0.65, 4)

    else:
        reasons.append(f"Low name similarity: {name_score:.2f}")

        decision = ResolutionDecision.UNCERTAIN
        score = round(name_score * 0.5, 4)

    return ResolutionResult(
        first.entity_id,
        second.entity_id,
        first.evidence_id,
        second.evidence_id,
        decision,
        score,
        reasons,
    )


def extract_entity_references(
    records: list[EvidenceRecord],
) -> list[EntityReference]:
    """Collect entities from all evidence records."""
    references = []

    for record in records:
        for entity in record.entities:
            references.append(
                EntityReference(
                    entity_id=entity.entity_id,
                    evidence_id=record.evidence_id,
                    name=entity.name,
                    entity_type=entity.entity_type,
                    attributes=entity.attributes or {},
                )
            )

    return references


def resolve_records(
    records: list[EvidenceRecord],
) -> list[ResolutionResult]:
    """Compare entities across different evidence records."""
    references = extract_entity_references(records)
    results = []

    for index, first in enumerate(references):
        for second in references[index + 1:]:
            # Do not compare entities from the same evidence record.
            if first.evidence_id == second.evidence_id:
                continue

            results.append(
                compare_entities(first, second)
            )

    return results

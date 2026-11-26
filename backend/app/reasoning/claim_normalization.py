
import re
from dataclasses import dataclass
from typing import Any

from backend.app.schemas.evidence import ExtractedClaim


@dataclass
class NormalizedClaim:
    claim_id: str
    original_subject: str
    normalized_subject: str
    original_predicate: str
    normalized_predicate: str
    original_object: Any
    normalized_object: Any
    normalization_notes: list[str]

    def to_dict(self) -> dict:
        return {
            "claim_id": self.claim_id,
            "original_subject": self.original_subject,
            "normalized_subject": self.normalized_subject,
            "original_predicate": self.original_predicate,
            "normalized_predicate": self.normalized_predicate,
            "original_object": self.original_object,
            "normalized_object": self.normalized_object,
            "normalization_notes": self.normalization_notes,
        }


class ClaimNormalizationEngine:
    """
    Normalizes common claim formats without modifying original claims.

    This is deliberately conservative:
    - Unknown predicates retain their original values.
    - Numeric values are not converted without a known unit.
    - Original extracted claims remain unchanged.
    """

    PREDICATE_ALIASES = {
        "age": "age",
        "person_age": "age",
        "date_of_birth": "date_of_birth",
        "dob": "date_of_birth",
        "birth_date": "date_of_birth",
        "email_address": "email",
        "email": "email",
        "phone_number": "phone",
        "mobile_number": "phone",
        "mobile": "phone",
        "phone": "phone",
        "company": "employer",
        "organization": "employer",
        "organisation": "employer",
        "employer": "employer",
    }

    AGE_PATTERN = re.compile(
        r"^\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?|y)?\s*$",
        re.IGNORECASE,
    )

    def normalize_predicate(self, predicate: str) -> str:
        cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", predicate.strip())
        cleaned = cleaned.strip("_").casefold()

        return self.PREDICATE_ALIASES.get(cleaned, cleaned)

    @staticmethod
    def normalize_subject(subject: str) -> str:
        return " ".join(subject.casefold().split())

    def normalize_value(
        self,
        predicate: str,
        value: Any,
    ) -> tuple[Any, list[str]]:

        notes = []

        if value is None:
            return None, ["Value is missing; no normalization performed."]

        if predicate == "age":

            if isinstance(value, bool):
                return value, ["Boolean value retained; not treated as an age."]

            if isinstance(value, (int, float)):
                if value < 0:
                    return value, ["Negative age retained; requires review."]

                return value, ["Numeric age value normalized."]

            if isinstance(value, str):
                match = self.AGE_PATTERN.fullmatch(value)

                if match:
                    number = float(match.group(1))

                    normalized = (
                        int(number)
                        if number.is_integer()
                        else number
                    )

                    return normalized, [
                        "Age unit text removed.",
                        "Age represented as a numeric value.",
                    ]

        if isinstance(value, str):
            normalized = " ".join(value.strip().split())
            return normalized, ["Whitespace normalized."]

        return value, ["Value retained without transformation."]

    def normalize(
        self,
        claim: ExtractedClaim,
    ) -> NormalizedClaim:

        normalized_subject = self.normalize_subject(claim.subject)

        normalized_predicate = self.normalize_predicate(
            claim.predicate
        )

        normalized_object, notes = self.normalize_value(
            normalized_predicate,
            claim.object,
        )

        return NormalizedClaim(
            claim_id=claim.claim_id,
            original_subject=claim.subject,
            normalized_subject=normalized_subject,
            original_predicate=claim.predicate,
            normalized_predicate=normalized_predicate,
            original_object=claim.object,
            normalized_object=normalized_object,
            normalization_notes=notes,
        )

    def normalize_many(
        self,
        claims: list[ExtractedClaim],
    ) -> list[NormalizedClaim]:

        return [
            self.normalize(claim)
            for claim in claims
        ]

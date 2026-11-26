
import re
from typing import Any

from backend.app.schemas.evidence import (
    ExtractedClaim,
    SourceLocation,
)


class ClaimExtractionEngine:
    """Extract basic factual claims from document text."""

    AGE_PATTERN = re.compile(
        r"\b(?P<subject>[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)"
        r"\s+is\s+(?P<age>\d{1,3})\s+years?\s+old\b",
        re.IGNORECASE,
    )

    def extract_from_text(
        self,
        text: str,
        page_number: int | None = None,
    ) -> list[ExtractedClaim]:

        if not isinstance(text, str) or not text.strip():
            return []

        claims = []

        for match in self.AGE_PATTERN.finditer(text):
            subject = match.group("subject").strip()
            age = int(match.group("age"))

            if age > 120:
                continue

            claims.append(
                ExtractedClaim(
                    subject=subject,
                    predicate="AGE",
                    object=age,
                    source_location=SourceLocation(
                        page=page_number
                    ),
                    extraction_confidence=0.90,
                )
            )

        return claims

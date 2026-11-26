
from __future__ import annotations

import re
from pathlib import Path

import pymupdf as fitz

from backend.app.schemas.evidence import (
    EvidenceRecord,
    EvidenceModality,
    ExtractedEntity,
)
from backend.app.reasoning.claim_extraction import (
    ClaimExtractionEngine,
)


class PDFExtractionError(Exception):
    """Raised when PDF extraction fails."""


class PDFExtractor:
    """Extract PDF text, person entities, emails and recognized claims."""

    AGE_PATTERN = re.compile(
        r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})"
        r"\s+is\s+(\d{1,3})\s+years?\s+old\b",
        re.IGNORECASE,
    )

    EMAIL_PATTERN = re.compile(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        re.IGNORECASE,
    )

    def __init__(
        self,
        minimum_text_length: int = 1,
        include_page_metadata: bool = True,
    ):
        self.minimum_text_length = minimum_text_length
        self.include_page_metadata = include_page_metadata
        self.claim_engine = ClaimExtractionEngine()

    @staticmethod
    def normalize_name(value: str) -> str:
        return re.sub(
            r"[^a-z0-9]",
            "",
            value.casefold(),
        )

    @staticmethod
    def normalize_email(value: str) -> str:
        return value.strip().casefold()

    def extract_text(self, file_path: str | Path) -> list[dict]:
        path = Path(file_path)

        if not path.exists():
            raise PDFExtractionError(
                f"PDF file not found: {path}"
            )

        if path.suffix.lower() != ".pdf":
            raise PDFExtractionError(
                "Only PDF files are supported."
            )

        pages = []

        try:
            with fitz.open(path) as document:

                if document.is_encrypted:
                    raise PDFExtractionError(
                        "Encrypted PDFs are not supported."
                    )

                for page_index, page in enumerate(document):

                    text = page.get_text("text").strip()

                    if len(text) < self.minimum_text_length:
                        continue

                    page_data = {
                        "page_number": page_index + 1,
                        "text": text,
                    }

                    if self.include_page_metadata:
                        page_data["metadata"] = {
                            "width": page.rect.width,
                            "height": page.rect.height,
                            "rotation": page.rotation,
                        }

                    pages.append(page_data)

        except PDFExtractionError:
            raise

        except Exception as exc:
            raise PDFExtractionError(
                f"Could not extract PDF: {exc}"
            ) from exc

        return pages

    def extract_record(
        self,
        file_path: str | Path,
    ) -> EvidenceRecord:

        path = Path(file_path)
        pages = self.extract_text(path)

        if not pages:
            raise PDFExtractionError(
                "No extractable text was found in the PDF."
            )

        extracted_claims = []
        extracted_entities = []

        entity_ids_by_name = {}
        entity_objects_by_name = {}

        for page in pages:

            page_text = page["text"]
            page_number = page["page_number"]

            # STEP 1: Extract claims from this PDF page.
            page_claims = self.claim_engine.extract_from_text(
                text=page_text,
                page_number=page_number,
            )

            # STEP 2: Detect people from recognized age statements.
            person_names = {}

            for match in self.AGE_PATTERN.finditer(page_text):

                person_name = match.group(1).strip()
                normalized_name = self.normalize_name(
                    person_name
                )

                person_names[normalized_name] = person_name

            # STEP 3: Extract email addresses from the page.
            page_emails = {
                self.normalize_email(email)
                for email in self.EMAIL_PATTERN.findall(page_text)
            }

            # STEP 4: Associate an email only when the page has
            # exactly one distinct detected person and one email.
            #
            # This is a conservative page-level heuristic,
            # not proof that the email belongs to that person.
            email_by_person = {}

            if len(person_names) == 1 and len(page_emails) == 1:

                only_person = next(iter(person_names))
                only_email = next(iter(page_emails))

                email_by_person[only_person] = only_email

            # STEP 5: Create or update person entities.
            for normalized_name, person_name in person_names.items():

                email = email_by_person.get(normalized_name)

                if normalized_name not in entity_ids_by_name:

                    attributes = {}

                    if email:
                        attributes["email"] = email

                    entity = ExtractedEntity(
                        name=person_name,
                        entity_type="PERSON",
                        normalized_name=normalized_name,
                        attributes=attributes,
                    )

                    extracted_entities.append(entity)

                    entity_ids_by_name[normalized_name] = (
                        entity.entity_id
                    )

                    entity_objects_by_name[normalized_name] = entity

                elif email:

                    # Add an email discovered on a later page
                    # without replacing the existing entity ID.
                    existing_entity = entity_objects_by_name[
                        normalized_name
                    ]

                    updated_attributes = dict(
                        existing_entity.attributes
                    )

                    existing_email = updated_attributes.get("email")

                    if not existing_email:
                        updated_attributes["email"] = email

                        updated_entity = existing_entity.model_copy(
                            update={
                                "attributes": updated_attributes
                            }
                        )

                        entity_objects_by_name[
                            normalized_name
                        ] = updated_entity

                        entity_index = extracted_entities.index(
                            existing_entity
                        )

                        extracted_entities[
                            entity_index
                        ] = updated_entity

            # STEP 6: Link each claim to its person entity.
            for claim in page_claims:

                normalized_subject = self.normalize_name(
                    claim.subject
                )

                entity_id = entity_ids_by_name.get(
                    normalized_subject
                )

                if entity_id:
                    claim = claim.model_copy(
                        update={
                            "subject_entity_id": entity_id,
                        }
                    )

                extracted_claims.append(claim)

        total_characters = sum(
            len(page["text"]) for page in pages
        )

        return EvidenceRecord(
            source_name=path.name,
            modality=EvidenceModality.PDF_DOCUMENT,
            source_uri=path.resolve().as_uri(),
            entities=extracted_entities,
            claims=extracted_claims,
            metadata={
                "extractor": "PyMuPDF",
                "extraction_type": (
                    "text_entity_email_and_basic_claims"
                ),
                "page_count": len(pages),
                "characters_extracted": total_characters,
                "entities_extracted": len(extracted_entities),
                "claims_extracted": len(extracted_claims),
                "ocr_performed": False,
                "email_association": (
                    "Conservative single-person, single-email "
                    "page-level heuristic"
                ),
                "limitations": [
                    "Extracts embedded PDF text only.",
                    "Scanned PDF pages require OCR.",
                    "Person extraction currently supports basic age statements.",
                    "Email association is heuristic, not proof of identity.",
                    "Multiple people or emails on one page are not automatically associated.",
                    "Entity mentions are not independently verified identities.",
                ],
            },
        )

    def extract(self, file_path: str | Path) -> EvidenceRecord:
        """Compatibility method for the ingestion service."""
        return self.extract_record(file_path)

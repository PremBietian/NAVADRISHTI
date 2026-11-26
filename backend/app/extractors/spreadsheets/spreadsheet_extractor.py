
from pathlib import Path
from importlib import import_module
import re

from backend.app.schemas.evidence import (
    EvidenceRecord,
    EvidenceModality,
    SourceLocation,
    ExtractedEntity,
)

from backend.app.reasoning.claim_extraction import (
    ClaimExtractionEngine,
)


class SpreadsheetExtractionError(Exception):
    """Raised when spreadsheet extraction fails."""


class SpreadsheetExtractor:
    """
    Extract claims and entity mentions from Excel spreadsheets.

    Supported:
    - Age claim extraction
    - Person entity extraction
    - Email attribute extraction
    - Claim-to-entity linking
    - Sheet and row traceability
    """

    NAME_HEADERS = {
        "name",
        "full name",
        "person",
        "employee name",
        "person name",
        "customer name",
    }

    AGE_HEADERS = {
        "age",
        "person age",
    }

    EMAIL_HEADERS = {
        "email",
        "email address",
        "e mail",
        "employee email",
        "personal email",
    }

    def __init__(self):
        self.claim_engine = ClaimExtractionEngine()

    @staticmethod
    def normalize_name(name: str) -> str:
        """Normalize a person's name for entity matching."""
        return re.sub(
            r"[^a-z0-9]",
            "",
            name.lower().strip(),
        )

    @staticmethod
    def value_to_text(value) -> str:
        """Convert Excel values into clean text."""
        if value is None:
            return ""

        if isinstance(value, float) and value.is_integer():
            return str(int(value))

        return str(value).strip()

    def extract_record(self, file_path: str) -> EvidenceRecord:

        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(
                f"Spreadsheet not found: {path}"
            )

        if path.suffix.lower() not in [".xlsx", ".xlsm"]:
            raise SpreadsheetExtractionError(
                "Only .xlsx and .xlsm files are supported."
            )

        workbook = None
        extracted_claims = []
        extracted_entities = []
        processed_rows = 0

        try:
            load_workbook = import_module(
                "openpyxl"
            ).load_workbook

            workbook = load_workbook(
                filename=path,
                read_only=True,
                data_only=True,
            )

            for sheet in workbook.worksheets:

                rows = sheet.iter_rows(values_only=True)
                headers = None

                for row_number, row in enumerate(rows, start=1):

                    values = [
                        self.value_to_text(value)
                        for value in row
                    ]

                    if not any(values):
                        continue

                    processed_rows += 1

                    # First non-empty row is treated as headers.
                    if headers is None:
                        headers = [
                            value.lower().strip()
                            for value in values
                        ]
                        continue

                    row_data = dict(zip(headers, values))

                    name = None
                    age = None
                    email = None

                    # Identify important columns.
                    for key, value in row_data.items():

                        if not value:
                            continue

                        if key in self.NAME_HEADERS:
                            name = value

                        elif key in self.AGE_HEADERS:
                            age = value

                        elif key in self.EMAIL_HEADERS:
                            email = value

                    # ---------------------------------------
                    # 1. EXTRACT PERSON ENTITY
                    # ---------------------------------------

                    entity = None

                    if name:

                        attributes = {}

                        if email:
                            attributes["email"] = email.strip()

                        entity = ExtractedEntity(
                            name=name.strip(),
                            entity_type="PERSON",
                            normalized_name=self.normalize_name(name),
                            attributes=attributes,
                        )

                        extracted_entities.append(entity)

                    # ---------------------------------------
                    # 2. EXTRACT CLAIMS
                    # ---------------------------------------

                    candidate_texts = []

                    # Prefer a structured Name + Age statement.
                    if name and age:
                        candidate_texts.append(
                            f"{name} is {age} years old"
                        )

                    else:
                        # Preserve support for age statements
                        # already written in spreadsheet cells.
                        row_text = " ".join(
                            value for value in values if value
                        )

                        if row_text:
                            candidate_texts.append(row_text)

                    for text in candidate_texts:

                        claims = self.claim_engine.extract_from_text(
                            text
                        )

                        for claim in claims:

                            subject_entity_id = None

                            # Link the claim to the extracted entity.
                            if entity is not None:
                                if (
                                    self.normalize_name(claim.subject)
                                    == entity.normalized_name
                                ):
                                    subject_entity_id = entity.entity_id

                            updated_claim = claim.model_copy(
                                update={
                                    "subject_entity_id": subject_entity_id,
                                    "source_location": SourceLocation(
                                        sheet=sheet.title,
                                        row=row_number,
                                    ),
                                }
                            )

                            extracted_claims.append(updated_claim)

            return EvidenceRecord(
                source_name=path.name,
                source_uri=str(path.resolve()),
                modality=EvidenceModality.XLSX,
                claims=extracted_claims,
                entities=extracted_entities,
                metadata={
                    "sheet_names": workbook.sheetnames,
                    "processed_rows": processed_rows,
                    "extracted_claims": len(extracted_claims),
                    "extracted_entities": len(extracted_entities),
                    "extraction_method": "openpyxl",
                    "features": [
                        "Person entity extraction",
                        "Email attribute extraction",
                        "Age claim extraction",
                        "Claim-to-entity linking",
                        "Sheet and row traceability",
                    ],
                    "limitations": [
                        "Current claim extraction focuses on age statements.",
                        "Entity extraction currently supports recognized person-name columns.",
                    ],
                },
            )

        except SpreadsheetExtractionError:
            raise

        except Exception as exc:
            raise SpreadsheetExtractionError(
                f"Failed to extract spreadsheet: {exc}"
            ) from exc

        finally:
            if workbook is not None:
                workbook.close()

    def extract(self, file_path: str) -> EvidenceRecord:
        """Convenience alias."""
        return self.extract_record(file_path)

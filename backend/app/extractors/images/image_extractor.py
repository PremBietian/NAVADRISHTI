
from pathlib import Path
from collections import defaultdict
import re

import pytesseract
from pytesseract import Output

from PIL import Image, ImageOps, ImageEnhance

from backend.app.schemas.evidence import (
    EvidenceRecord,
    EvidenceModality,
    ExtractedEntity,
    ExtractedClaim,
    SourceLocation,
)


class ImageExtractionError(Exception):
    """Raised when image evidence extraction fails."""


class ImageExtractor:
    """
    CERBERUS-X image evidence extractor.

    Features:
    - OCR text extraction.
    - Person entity extraction.
    - Age claim extraction.
    - Email identifier extraction.
    - Normalized image-region traceability.

    Email association is deliberately conservative:
    it is attached automatically only when exactly one
    person and one unique email are detected in the image.
    """

    SUPPORTED_FORMATS = {
        ".png", ".jpg", ".jpeg", ".bmp",
        ".tiff", ".tif", ".webp"
    }

    EMAIL_PATTERN = re.compile(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
    )

    def __init__(self, tesseract_path=None):

        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path

        self.age_pattern = re.compile(
            r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)"
            r"\s+is\s+(\d{1,3})\s+years?\s+old\b",
            re.IGNORECASE,
        )

    def _prepare_image(self, file_path):

        path = Path(file_path)

        if not path.exists():
            raise ImageExtractionError(
                f"Image not found: {file_path}"
            )

        if path.suffix.lower() not in self.SUPPORTED_FORMATS:
            raise ImageExtractionError(
                f"Unsupported image format: {path.suffix}"
            )

        try:
            image = Image.open(path)
            image = ImageOps.exif_transpose(image)
            image = image.convert("RGB")
            image = ImageOps.grayscale(image)
            image = ImageEnhance.Contrast(image).enhance(1.5)

            return image

        except Exception as exc:
            raise ImageExtractionError(
                f"Could not prepare image: {exc}"
            ) from exc

    def _extract_lines(self, image):

        try:
            data = pytesseract.image_to_data(
                image,
                output_type=Output.DICT,
                config="--psm 6",
            )

        except Exception as exc:
            raise ImageExtractionError(
                f"Tesseract OCR failed: {exc}"
            ) from exc

        grouped = defaultdict(list)

        for index, word in enumerate(data["text"]):

            word = word.strip()

            if not word:
                continue

            try:
                confidence = float(data["conf"][index])
            except (ValueError, TypeError):
                continue

            if confidence < 0:
                continue

            key = (
                data["page_num"][index],
                data["block_num"][index],
                data["par_num"][index],
                data["line_num"][index],
            )

            grouped[key].append({
                "text": word,
                "confidence": confidence,
                "left": data["left"][index],
                "top": data["top"][index],
                "width": data["width"][index],
                "height": data["height"][index],
            })

        lines = []

        for words in grouped.values():

            text = " ".join(
                word["text"] for word in words
            )

            x1 = min(word["left"] for word in words)
            y1 = min(word["top"] for word in words)

            x2 = max(
                word["left"] + word["width"]
                for word in words
            )

            y2 = max(
                word["top"] + word["height"]
                for word in words
            )

            lines.append({
                "text": text,
                "confidence": sum(
                    word["confidence"] for word in words
                ) / len(words),
                "box": (x1, y1, x2, y2),
            })

        return lines

    def extract_text(self, file_path):

        image = self._prepare_image(file_path)
        lines = self._extract_lines(image)

        return "\n".join(
            line["text"] for line in lines
        )

    def extract_record(self, file_path):

        path = Path(file_path)
        image = self._prepare_image(file_path)

        width, height = image.size

        if width <= 0 or height <= 0:
            raise ImageExtractionError(
                "Invalid image dimensions."
            )

        lines = self._extract_lines(image)

        if not lines:
            raise ImageExtractionError(
                "No readable text found in image."
            )

        extracted_text = "\n".join(
            line["text"] for line in lines
        )

        # Extract unique email identifiers from OCR text.
        email_matches = {
            email.casefold()
            for email in self.EMAIL_PATTERN.findall(extracted_text)
        }

        # Find all age statements before creating entities.
        detected_people = {}

        for line in lines:
            for match in self.age_pattern.finditer(line["text"]):

                person_name = match.group(1).strip()

                normalized_name = re.sub(
                    r"\s+",
                    "",
                    person_name,
                ).casefold()

                detected_people[normalized_name] = person_name

        # Only associate an email automatically when
        # there is exactly one person and exactly one email.
        associated_email = None

        if len(detected_people) == 1 and len(email_matches) == 1:
            associated_email = next(iter(email_matches))

        entities = []
        claims = []
        person_entities = {}

        for line in lines:

            for match in self.age_pattern.finditer(line["text"]):

                person_name = match.group(1).strip()
                age = int(match.group(2))

                normalized_name = re.sub(
                    r"\s+",
                    "",
                    person_name,
                ).casefold()

                if normalized_name not in person_entities:

                    attributes = {}

                    if associated_email:
                        attributes["email"] = associated_email

                    entity = ExtractedEntity(
                        name=person_name,
                        entity_type="PERSON",
                        normalized_name=normalized_name,
                        attributes=attributes,
                    )

                    entities.append(entity)
                    person_entities[normalized_name] = entity

                entity = person_entities[normalized_name]

                x1, y1, x2, y2 = line["box"]

                image_region = (
                    x1 / width,
                    y1 / height,
                    x2 / width,
                    y2 / height,
                )

                claim = ExtractedClaim(
                    subject=person_name,
                    subject_entity_id=entity.entity_id,
                    predicate="AGE",
                    object=age,
                    source_location=SourceLocation(
                        image_region=image_region,
                    ),
                    verification_status="UNVERIFIED",
                )

                claims.append(claim)

        return EvidenceRecord(
            source_name=path.name,
            modality=EvidenceModality.IMAGE,
            source_uri=str(path.resolve()),
            entities=entities,
            claims=claims,
            metadata={
                "extraction_method": "Tesseract OCR",
                "ocr_version": "5.x",
                "image_width": width,
                "image_height": height,
                "extracted_text": extracted_text,
                "coordinate_format": "normalized_0_to_1",
                "claim_extraction": "age_statements_only",
                "email_identifiers_detected": len(email_matches),
                "email_association": (
                    "single_person_single_email"
                    if associated_email
                    else "not_associated"
                ),
            },
        )

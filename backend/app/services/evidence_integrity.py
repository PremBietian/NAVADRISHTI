
from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path

from backend.app.schemas.evidence import EvidenceRecord


class IntegrityStatus(str, Enum):
    VERIFIED = "VERIFIED"
    MODIFIED = "MODIFIED"
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    HASH_NOT_RECORDED = "HASH_NOT_RECORDED"
    INVALID_HASH = "INVALID_HASH"
    READ_ERROR = "READ_ERROR"


@dataclass
class EvidenceIntegrityResult:
    evidence_id: str
    source_name: str
    file_path: str
    status: IntegrityStatus
    expected_hash: str | None
    calculated_hash: str | None
    explanation: str

    @property
    def is_verified(self) -> bool:
        return self.status == IntegrityStatus.VERIFIED

    def to_dict(self) -> dict:
        result = asdict(self)
        result["status"] = self.status.value
        result["is_verified"] = self.is_verified
        return result


class EvidenceIntegrityEngine:
    """
    Calculates and verifies SHA-256 fingerprints of local evidence files.

    A matching hash proves that the file bytes match the recorded
    fingerprint. It does not prove who created the file or whether
    its contents are truthful.
    """

    CHUNK_SIZE = 1024 * 1024  # Read files in 1 MB chunks.

    @staticmethod
    def calculate_sha256(file_path: str | Path) -> str:
        """
        Calculate the SHA-256 fingerprint of a local file.
        """

        path = Path(file_path)

        if not path.is_file():
            raise FileNotFoundError(f"Evidence file not found: {path}")

        sha256 = hashlib.sha256()

        with path.open("rb") as file:
            while True:
                chunk = file.read(EvidenceIntegrityEngine.CHUNK_SIZE)

                if not chunk:
                    break

                sha256.update(chunk)

        return sha256.hexdigest()

    def fingerprint_record(
        self,
        record: EvidenceRecord,
        file_path: str | Path,
    ) -> EvidenceRecord:
        """
        Calculate a file fingerprint and return an updated copy
        of the evidence record.

        The original record is not modified.
        """

        calculated_hash = self.calculate_sha256(file_path)

        return record.model_copy(
            update={"source_hash_sha256": calculated_hash}
        )

    def verify_record(
        self,
        record: EvidenceRecord,
        file_path: str | Path,
    ) -> EvidenceIntegrityResult:
        """
        Compare the current file fingerprint with the fingerprint
        stored in the evidence record.
        """

        path = Path(file_path)
        expected_hash = record.source_hash_sha256

        if not path.is_file():
            return EvidenceIntegrityResult(
                evidence_id=record.evidence_id,
                source_name=record.source_name,
                file_path=str(path),
                status=IntegrityStatus.FILE_NOT_FOUND,
                expected_hash=expected_hash,
                calculated_hash=None,
                explanation="The original evidence file could not be found.",
            )

        if not expected_hash:
            return EvidenceIntegrityResult(
                evidence_id=record.evidence_id,
                source_name=record.source_name,
                file_path=str(path),
                status=IntegrityStatus.HASH_NOT_RECORDED,
                expected_hash=None,
                calculated_hash=None,
                explanation=(
                    "No original SHA-256 fingerprint is recorded. "
                    "Integrity cannot be verified."
                ),
            )

        normalized_expected_hash = expected_hash.strip().lower()

        if (
            len(normalized_expected_hash) != 64
            or any(
                character not in "0123456789abcdef"
                for character in normalized_expected_hash
            )
        ):
            return EvidenceIntegrityResult(
                evidence_id=record.evidence_id,
                source_name=record.source_name,
                file_path=str(path),
                status=IntegrityStatus.INVALID_HASH,
                expected_hash=expected_hash,
                calculated_hash=None,
                explanation="The recorded SHA-256 fingerprint is invalid.",
            )

        try:
            calculated_hash = self.calculate_sha256(path)

        except OSError as error:
            return EvidenceIntegrityResult(
                evidence_id=record.evidence_id,
                source_name=record.source_name,
                file_path=str(path),
                status=IntegrityStatus.READ_ERROR,
                expected_hash=expected_hash,
                calculated_hash=None,
                explanation=f"Could not read the evidence file: {error}",
            )

        if calculated_hash == normalized_expected_hash:
            return EvidenceIntegrityResult(
                evidence_id=record.evidence_id,
                source_name=record.source_name,
                file_path=str(path),
                status=IntegrityStatus.VERIFIED,
                expected_hash=expected_hash,
                calculated_hash=calculated_hash,
                explanation=(
                    "The current file fingerprint matches the "
                    "fingerprint recorded during ingestion."
                ),
            )

        return EvidenceIntegrityResult(
            evidence_id=record.evidence_id,
            source_name=record.source_name,
            file_path=str(path),
            status=IntegrityStatus.MODIFIED,
            expected_hash=expected_hash,
            calculated_hash=calculated_hash,
            explanation=(
                "The current file fingerprint does not match the "
                "recorded fingerprint. The file may have changed."
            ),
        )

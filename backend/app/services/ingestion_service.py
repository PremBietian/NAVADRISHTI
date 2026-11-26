
from __future__ import annotations

import json
import os

from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Any

from backend.app.schemas.evidence import (
    EvidenceRecord,
    EvidenceModality,
)

from backend.app.services.evidence_integrity import (
    EvidenceIntegrityEngine,
)

from backend.app.graph.knowledge_graph import (
    KnowledgeGraph,
)

from backend.app.reasoning.source_reliability import (
    SourceReliabilityEngine,
)

from backend.app.reasoning.contradiction_engine import (
    ContradictionEngine,
)

from backend.app.reasoning.evidence_verification import (
    EvidenceVerificationEngine,
)


# Project root: CERBERUS-X/
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# Permanent local storage.
STORAGE_DIR = PROJECT_ROOT / "storage"
RECORDS_FILE = STORAGE_DIR / "evidence_records.json"


@dataclass
class IngestionResult:
    evidence: EvidenceRecord
    integrity: Any
    reliability: Any
    verification_results: list[Any] = field(default_factory=list)
    contradiction_results: list[Any] = field(default_factory=list)
    graph_summary: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "evidence": self.evidence.model_dump(mode="json"),
            "integrity": self.integrity.to_dict(),
            "reliability": self.reliability.to_dict(),
            "verification_results": [
                item.to_dict() if hasattr(item, "to_dict") else item
                for item in self.verification_results
            ],
            "contradiction_results": [
                item.to_dict() if hasattr(item, "to_dict") else item
                for item in self.contradiction_results
            ],
            "graph_summary": self.graph_summary,
        }


class EvidenceIngestionService:
    """
    Coordinates multimodal evidence ingestion.

    Features:
    - PDF, spreadsheet and image extraction.
    - SHA-256 integrity verification.
    - Startup and live integrity re-verification.
    - Compromised evidence isolation.
    - Source reliability assessment.
    - Entity and claim graph integration.
    - Cross-source contradiction detection.
    - Evidence verification.
    - Persistent local evidence storage.
    - Automatic record restoration after restart.

    IMPORTANT:
    All evidence is preserved in permanent storage.
    Only currently verified evidence participates in
    active reasoning and graph construction.
    """

    def __init__(self) -> None:

        self.integrity_engine = EvidenceIntegrityEngine()
        self.reliability_engine = SourceReliabilityEngine()
        self.contradiction_engine = ContradictionEngine()
        self.verification_engine = EvidenceVerificationEngine()
        self.knowledge_graph = KnowledgeGraph()

        # Complete evidence archive.
        self.records: list[EvidenceRecord] = []

        # Original file locations.
        self.file_paths: dict[str, str] = {}

        # Latest known integrity results.
        # The existing API uses this attribute.
        self.startup_integrity_results: dict[str, Any] = {}

        # Restore saved evidence when the API starts.
        self._load_records()

    def _save_records(self) -> None:
        """
        Save all evidence records and file paths permanently.

        Uses a temporary file followed by replacement to reduce
        the chance of leaving a partially written JSON file.
        """

        STORAGE_DIR.mkdir(parents=True, exist_ok=True)

        data = {
            "project": "CERBERUS-X",
            "version": "1.0",
            "records": [
                record.model_dump(mode="json")
                for record in self.records
            ],
            "file_paths": self.file_paths,
        }

        temporary_file = RECORDS_FILE.with_suffix(".tmp")

        try:
            with temporary_file.open(
                "w",
                encoding="utf-8",
            ) as file:
                json.dump(
                    data,
                    file,
                    ensure_ascii=False,
                    indent=4,
                )

            os.replace(temporary_file, RECORDS_FILE)

        except Exception:
            if temporary_file.exists():
                temporary_file.unlink()

            raise

    def _verify_all_records(self) -> list[EvidenceRecord]:
        """
        Recalculate SHA-256 integrity for every stored record.

        Returns only records whose original files are currently
        available and whose fingerprints match.

        All records remain preserved in self.records.
        """

        verified_records: list[EvidenceRecord] = []

        for record in self.records:

            original_path = self.file_paths.get(
                record.evidence_id
            )

            # An empty path is treated as a missing file by
            # the integrity engine.
            path_to_verify = original_path or ""

            integrity_result = (
                self.integrity_engine.verify_record(
                    record,
                    path_to_verify,
                )
            )

            # Refresh the latest integrity result.
            self.startup_integrity_results[
                record.evidence_id
            ] = integrity_result

            if integrity_result.is_verified:
                verified_records.append(record)

        return verified_records

    def _load_records(self) -> None:
        """
        Restore previously saved evidence records.

        Re-verifies original files using SHA-256 and reconstructs
        the knowledge graph using verified evidence only.
        """

        if not RECORDS_FILE.exists():
            return

        try:
            with RECORDS_FILE.open(
                "r",
                encoding="utf-8",
            ) as file:
                data = json.load(file)

            saved_records = data.get("records", [])
            saved_paths = data.get("file_paths", {})

            restored_records = [
                EvidenceRecord.model_validate(item)
                for item in saved_records
            ]

            self.records = restored_records
            self.file_paths = saved_paths

            print("\n" + "=" * 65)
            print("CERBERUS-X: STARTUP INTEGRITY VERIFICATION")
            print("=" * 65)

            verified_records = self._verify_all_records()

            for record in self.records:

                integrity_result = (
                    self.startup_integrity_results.get(
                        record.evidence_id
                    )
                )

                if integrity_result is None:
                    continue

                print(
                    f"\nEvidence: {record.source_name}"
                    f"\nStatus: {integrity_result.status.value}"
                    f"\nExplanation: {integrity_result.explanation}"
                )

                if not integrity_result.is_verified:
                    print(
                        "ACTION: Evidence excluded from active reasoning."
                    )

            print("\n" + "=" * 65)
            print("STARTUP INTEGRITY VERIFICATION COMPLETED")
            print("=" * 65)

            # Rebuild graph using verified evidence only.
            if verified_records:
                self.knowledge_graph.add_records(
                    verified_records
                )

            excluded_count = (
                len(self.records) - len(verified_records)
            )

            print(
                f"\nCERBERUS-X: Restored {len(self.records)} "
                "evidence records from permanent storage."
            )

            print(
                f"CERBERUS-X: {len(verified_records)} "
                "records eligible for active reasoning."
            )

            print(
                f"CERBERUS-X: {excluded_count} "
                "records excluded due to integrity issues.\n"
            )

        except Exception as exc:
            raise RuntimeError(
                "Could not restore CERBERUS-X evidence storage. "
                f"Check {RECORDS_FILE}. Error: {exc}"
            ) from exc

    def ingest_file(
        self,
        file_path: str | Path,
        modality: EvidenceModality,
        extractor: Callable[[Path], EvidenceRecord],
        author_provenance: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> IngestionResult:
        """
        Ingest one local evidence file.
        """

        path = Path(file_path)

        if not path.is_file():
            raise FileNotFoundError(
                f"Evidence file does not exist: {path}"
            )

        # STEP 1: Calculate original file fingerprint.
        original_hash = (
            self.integrity_engine.calculate_sha256(path)
        )

        # STEP 2: Extract evidence.
        record = extractor(path)

        if not isinstance(record, EvidenceRecord):
            raise TypeError(
                "The extractor must return an EvidenceRecord."
            )

        # STEP 3: Validate modality.
        if record.modality != modality:
            raise ValueError(
                f"Expected modality {modality.value}, "
                f"but extractor returned {record.modality.value}."
            )

        # STEP 4: Attach fingerprint and provenance.
        record = record.model_copy(
            update={
                "source_hash_sha256": original_hash,
                "author_provenance": (
                    author_provenance or record.author_provenance
                ),
                "source_uri": path.resolve().as_uri(),
                "metadata": {
                    **record.metadata,
                    **(metadata or {}),
                },
            }
        )

        # STEP 5: Verify file integrity.
        integrity_result = self.integrity_engine.verify_record(
            record,
            path,
        )

        if not integrity_result.is_verified:
            raise RuntimeError(
                "Evidence integrity verification failed: "
                f"{integrity_result.status.value}"
            )

        # STEP 6: Add evidence to the permanent archive.
        self.records.append(record)
        self.file_paths[record.evidence_id] = str(path.resolve())

        # Save the current integrity result.
        self.startup_integrity_results[
            record.evidence_id
        ] = integrity_result

        # STEP 7: Permanently save the evidence collection.
        try:
            self._save_records()

        except Exception:
            self.records.pop()
            self.file_paths.pop(record.evidence_id, None)
            self.startup_integrity_results.pop(
                record.evidence_id,
                None,
            )
            raise

        # STEP 8: Re-verify all records before reasoning.
        verified_records = self._verify_all_records()

        # STEP 9: Update graph using verified evidence only.
        if verified_records:
            self.knowledge_graph.add_records(
                verified_records
            )

        # STEP 10: Assess the newly ingested source.
        reliability_result = self.reliability_engine.assess(
            record,
            file_path=path,
        )

        # STEP 11: Detect contradictions using verified records only.
        contradiction_results = (
            self.contradiction_engine.analyze(
                verified_records
            )
        )

        # STEP 12: Verify claims using verified records only.
        verification_results = (
            self.verification_engine.verify(
                verified_records
            )
        )

        # STEP 13: Get graph summary.
        graph_summary = self.knowledge_graph.get_summary()

        return IngestionResult(
            evidence=record,
            integrity=integrity_result,
            reliability=reliability_result,
            verification_results=verification_results,
            contradiction_results=contradiction_results,
            graph_summary=graph_summary,
        )

    def get_ingested_records(self) -> list[EvidenceRecord]:
        """
        Return every archived evidence record,
        including records excluded from reasoning.
        """

        return list(self.records)

    def get_verified_records(self) -> list[EvidenceRecord]:
        """
        Recheck integrity and return currently verified records.
        """

        return self._verify_all_records()

    def get_ingestion_summary(self) -> dict[str, Any]:

        verified_records = self._verify_all_records()

        return {
            "total_evidence_records": len(self.records),
            "verified_evidence_records": len(verified_records),
            "excluded_evidence_records": (
                len(self.records) - len(verified_records)
            ),
            "total_entities": sum(
                len(record.entities) for record in self.records
            ),
            "total_claims": sum(
                len(record.claims) for record in self.records
            ),
            "tracked_file_paths": len(self.file_paths),
        }

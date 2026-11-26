
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from backend.app.schemas.evidence import EvidenceModality
from backend.app.services.ingestion_service import EvidenceIngestionService
from backend.app.ai.ollama_client import OllamaClient

from backend.app.extractors.pdf.pdf_extractor import PDFExtractor
from backend.app.extractors.spreadsheets.spreadsheet_extractor import SpreadsheetExtractor
from backend.app.extractors.images.image_extractor import ImageExtractor


app = FastAPI(
    title="CERBERUS-X API",
    description=(
        "Multimodal evidence intelligence system "
        "with local AI-assisted contradiction explanations."
    ),
    version="1.5.0",
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]

UPLOAD_DIR = PROJECT_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

TESSERACT_PATH = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


# Initialize core services.
ingestion_service = EvidenceIngestionService()
ollama_client = OllamaClient()


# Rebuild conflict cache from verified archived evidence.
# Modified or missing evidence cannot participate.
latest_conflicts = {
    conflict.conflict_id: conflict
    for conflict in ingestion_service.contradiction_engine.analyze(
        ingestion_service.get_verified_records()
    )
}


def get_extractor(extension: str):
    extension = extension.lower()

    if extension == ".pdf":
        return EvidenceModality.PDF_DOCUMENT, PDFExtractor()

    if extension in {".xlsx", ".xlsm"}:
        return EvidenceModality.XLSX, SpreadsheetExtractor()

    if extension in {
        ".png",
        ".jpg",
        ".jpeg",
        ".bmp",
        ".tiff",
        ".tif",
        ".webp",
    }:
        return EvidenceModality.IMAGE, ImageExtractor(
            tesseract_path=TESSERACT_PATH
        )

    raise HTTPException(
        status_code=400,
        detail=(
            "Unsupported file format. "
            "Upload PDF, Excel, or image files."
        ),
    )


@app.get("/health")
def health_check():
    return {
        "project": "CERBERUS-X",
        "status": "running",
        "message": "Multimodal intelligence API is operational.",
        "ingestion_summary": (
            ingestion_service.get_ingestion_summary()
        ),
    }


@app.post("/ingest")
async def ingest_evidence(
    file: UploadFile = File(...),
    author_provenance: str | None = Form(default=None),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided.",
        )

    extension = Path(file.filename).suffix.lower()

    modality, extractor = get_extractor(extension)

    safe_filename = f"{uuid4().hex}{extension}"
    destination = UPLOAD_DIR / safe_filename

    try:
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty.",
            )

        destination.write_bytes(content)

        if modality == EvidenceModality.IMAGE:
            extract_method = extractor.extract_record
        else:
            extract_method = extractor.extract

        result = ingestion_service.ingest_file(
            file_path=destination,
            modality=modality,
            extractor=extract_method,
            author_provenance=author_provenance,
            metadata={
                "original_filename": Path(file.filename).name,
            },
        )

        # Preserve newly generated Python conflicts.
        latest_conflicts.update({
            conflict.conflict_id: conflict
            for conflict in result.contradiction_results
        })

        return {
            "status": "success",
            "message": (
                "Evidence ingested and analyzed successfully."
            ),
            "result": result.to_dict(),
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Evidence processing failed: {str(exc)}",
        ) from exc

    finally:
        await file.close()


@app.get("/results")
def get_results():
    return {
        "project": "CERBERUS-X",
        "summary": ingestion_service.get_ingestion_summary(),
        "records": [
            record.model_dump(mode="json")
            for record in ingestion_service.get_ingested_records()
        ],
    }


@app.get("/integrity")
def get_integrity_results():
    """
    Recheck and return SHA-256 integrity results.
    """

    ingestion_service.get_verified_records()

    results = []

    for record in ingestion_service.get_ingested_records():

        integrity_result = (
            ingestion_service.startup_integrity_results.get(
                record.evidence_id
            )
        )

        if integrity_result is not None:
            results.append(integrity_result.to_dict())

        else:
            results.append({
                "evidence_id": record.evidence_id,
                "source_name": record.source_name,
                "file_path": ingestion_service.file_paths.get(
                    record.evidence_id
                ),
                "status": "FILE_NOT_FOUND",
                "expected_hash": record.source_hash_sha256,
                "calculated_hash": None,
                "is_verified": False,
                "explanation": (
                    "Integrity verification result is unavailable."
                ),
            })

    verified_count = sum(
        1 for item in results
        if item["is_verified"]
    )

    status_counts = {}

    for item in results:
        status = item["status"]
        status_counts[status] = status_counts.get(status, 0) + 1

    return {
        "project": "CERBERUS-X",
        "integrity_engine": "SHA-256",
        "summary": {
            "total_files": len(results),
            "verified_files": verified_count,
            "unverified_files": len(results) - verified_count,
            "status_counts": status_counts,
        },
        "results": results,
    }


@app.get("/ai/status")
def ai_status():
    status = ollama_client.check_status()

    return {
        "project": "CERBERUS-X",
        "ai_service": "Ollama",
        **status,
    }


@app.post("/ai/explain/{conflict_id}")
def explain_conflict(conflict_id: str):

    # STEP 1: Find a Python-generated conflict.
    conflict = latest_conflicts.get(conflict_id)

    if conflict is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Conflict not found. Upload evidence first "
                "and use a conflict_id from the ingestion result."
            ),
        )

    # STEP 2: Recalculate integrity of archived evidence.
    verified_records = ingestion_service.get_verified_records()

    verified_evidence_ids = {
        record.evidence_id
        for record in verified_records
    }

    # STEP 3: Check both evidence sources.
    required_evidence_ids = {
        conflict.evidence_a_id,
        conflict.evidence_b_id,
    }

    if not required_evidence_ids.issubset(
        verified_evidence_ids
    ):

        failed_evidence = []

        for evidence_id in required_evidence_ids:
            if evidence_id not in verified_evidence_ids:

                integrity_result = (
                    ingestion_service.startup_integrity_results.get(
                        evidence_id
                    )
                )

                failed_evidence.append({
                    "evidence_id": evidence_id,
                    "integrity_status": (
                        integrity_result.status.value
                        if integrity_result is not None
                        else "UNKNOWN"
                    ),
                })

        raise HTTPException(
            status_code=409,
            detail={
                "message": (
                    "AI explanation blocked. One or more evidence "
                    "files involved in this conflict failed "
                    "integrity verification."
                ),
                "reason": "UNVERIFIED_EVIDENCE",
                "blocked_evidence": failed_evidence,
            },
        )

    # STEP 4: Check local AI availability.
    status = ollama_client.check_status()

    if not status["available"] or not status["model_available"]:
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Local AI service is unavailable.",
                "ai_status": status,
            },
        )

    # STEP 5: Prepare deterministic conflict data.
    conflict_data = {
        "conflict_id": conflict.conflict_id,
        "conflict_type": conflict.conflict_type.value,
        "claim_a_id": conflict.claim_a_id,
        "claim_b_id": conflict.claim_b_id,
        "evidence_a_id": conflict.evidence_a_id,
        "evidence_b_id": conflict.evidence_b_id,
        "source_a": conflict.source_a,
        "source_b": conflict.source_b,
        "subject": conflict.subject,
        "predicate": conflict.predicate,
        "value_a": conflict.value_a,
        "value_b": conflict.value_b,
        "python_explanation": conflict.explanation,
        "confidence": conflict.confidence,
        "metadata": conflict.metadata,
    }

    # STEP 6: Ask local Llama to explain.
    try:
        ai_result = ollama_client.explain_conflict(
            conflict_data
        )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI explanation failed: {str(exc)}",
        ) from exc

    # STEP 7: Return explanation without changing Python analysis.
    return {
        "project": "CERBERUS-X",
        "conflict_id": conflict.conflict_id,
        "deterministic_analysis": {
            "conflict_type": conflict.conflict_type.value,
            "explanation": conflict.explanation,
        },
        "ai_analysis": ai_result,
        "decision_authority": (
            "Python contradiction engine. "
            "AI provides explanations only and does not select "
            "a winning evidence source."
        ),
    }

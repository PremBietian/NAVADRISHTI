# CERBERUS-X
### A Knowledge System Where Every Modality Can Contradict the Others

CERBERUS-X is a multimodal evidence intelligence platform that ingests PDF documents, Excel spreadsheets, and images to extract evidence, identify entities and claims, detect contradictions, and verify file integrity.

It combines deterministic Python-based reasoning with optional local AI explanations to support human investigation.

## Key Features

- **Multimodal Evidence Ingestion:** Upload PDF, XLSX, PNG, JPG, and JPEG files.
- **Text Extraction:** Extract information from PDFs, spreadsheets, and images using OCR.
- **Entity and Claim Extraction:** Identify entities and factual claims from evidence.
- **Entity Resolution:** Connect references to the same entity across different sources.
- **Knowledge Graph:** Represent relationships between evidence, entities, and claims.
- **Contradiction Detection:** Identify disagreements between claims for human review.
- **Evidence Integrity:** Use SHA-256 hashes to detect file modifications.
- **Local AI Explanations:** Use Ollama with Llama 3.2 for explanations of supported conflicts.

## Technology Stack

**Frontend**
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts
- XYFlow

**Backend**
- Python
- FastAPI
- NetworkX
- Pydantic
- PyMuPDF
- OpenPyXL
- Pillow
- Tesseract OCR
- Ollama

## System Workflow

1. Upload evidence files.
2. Extract text and preserve source information.
3. Identify entities and claims.
4. Normalize claims into comparable representations.
5. Resolve entities across evidence sources.
6. Construct the knowledge graph.
7. Detect agreements and contradictions.
8. Verify file integrity using SHA-256.
9. Use local AI to explain supported conflicts.

## Getting Started

### Prerequisites

Install:
- Python 3.12 or compatible version
- Node.js and npm
- Tesseract OCR
- Ollama

### 1. Clone the repository

```bash
git clone https://github.com/PremBietian/NAVADRISHTI.git
cd NAVADRISHTI
```

### 2. Set up the Python backend

```bash
python -m venv .venv
```

Activate the environment on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install backend dependencies:

```bash
python -m pip install -r backend/requirements.txt
```

### 3. Set up local AI

Install Ollama and download the model:

```bash
ollama pull llama3.2:1b
```

Make sure the Ollama service is running.

### 4. Start the backend

From the project root:

```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Backend health check:

```text
http://127.0.0.1:8000/health
```

### 5. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your browser.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Backend health |
| POST | `/ingest` | Upload evidence |
| GET | `/results` | Retrieve extracted results |
| GET | `/integrity` | Check file integrity |
| GET | `/ai/status` | Check local AI status |
| POST | `/ai/explain/{conflict_id}` | Explain a supported conflict |

## Important Design Principles

- The Python contradiction engine is authoritative for conflict detection.
- AI provides explanations; it does not determine factual truth.
- Conflicts are flagged for human review.
- SHA-256 verification confirms file integrity against a stored hash, not the truth of its contents.
- File integrity and claim verification are separate concepts.

## Project Status

CERBERUS-X includes a working frontend and FastAPI backend with evidence ingestion, extraction, graph construction, contradiction analysis, integrity verification, and local AI integration.

## Repository

[GitHub – NAVADRISHTI](https://github.com/PremBietian/NAVADRISHTI)
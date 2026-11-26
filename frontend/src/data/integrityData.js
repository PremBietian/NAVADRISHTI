export const HASH_PENDING_LABEL = 'Hash available after backend integration.';

export const integritySummary = {
  datasetLabel: 'Demonstration Data',
  algorithm: 'SHA-256',
  verifiedFiles: 3,
  unverifiedFiles: 0,
  excludedFiles: 0,
  statusText: '3 Verified · 0 Unverified (Demonstration Sample)',
  explanation:
    'Cryptographic SHA-256 verification status reflects the demonstration fixture. Live expected and calculated file digests are computed on ingestion once connected to the FastAPI backend.',
};

export const integrityRecords = {
  'EVD-8510526DFC1B': {
    evidenceId: 'EVD-8510526DFC1B',
    modality: 'PDF',
    source: 'corporate_registry_filing.pdf',
    integrityStatus: 'VERIFIED',
    datasetLabel: 'Demonstration Status',
    algorithm: 'SHA-256',
    expectedHash: HASH_PENDING_LABEL,
    calculatedHash: HASH_PENDING_LABEL,
    verificationExplanation:
      'Demonstration record marked VERIFIED. Live SHA-256 digest matching against stored chain-of-custody records becomes active after FastAPI backend integration.',
  },
  'EVD-4D86453C03B7': {
    evidenceId: 'EVD-4D86453C03B7',
    modality: 'Excel',
    source: 'hr_roster_spreadsheet.xlsx',
    integrityStatus: 'VERIFIED',
    datasetLabel: 'Demonstration Status',
    algorithm: 'SHA-256',
    expectedHash: HASH_PENDING_LABEL,
    calculatedHash: HASH_PENDING_LABEL,
    verificationExplanation:
      'Demonstration record marked VERIFIED. Live SHA-256 digest matching against stored chain-of-custody records becomes active after FastAPI backend integration.',
  },
  'EVD-A383CB349785': {
    evidenceId: 'EVD-A383CB349785',
    modality: 'Image/OCR',
    source: 'scanned_id_record.png',
    integrityStatus: 'VERIFIED',
    datasetLabel: 'Demonstration Status',
    algorithm: 'SHA-256',
    expectedHash: HASH_PENDING_LABEL,
    calculatedHash: HASH_PENDING_LABEL,
    verificationExplanation:
      'Demonstration record marked VERIFIED. Live SHA-256 digest matching against stored chain-of-custody records becomes active after FastAPI backend integration.',
  },
};

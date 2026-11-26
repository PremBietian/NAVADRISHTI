export const DATASET_NOTICE =
  'Demonstration dataset only. Figures and records represent a supplied sample investigation fixture and are not live backend data.';

export const evidenceRecords = [
  {
    id: 'EVD-8510526DFC1B',
    modality: 'PDF',
    fileType: 'application/pdf',
    source: 'corporate_registry_filing.pdf',
    sourceLabel: 'PDF Document',
    claimSummary: 'Rahul Kumar age 25',
    subject: 'Rahul Kumar',
    predicate: 'AGE',
    value: '25',
    numericValue: 25,
    integrity: 'VERIFIED',
    datasetType: 'Demonstration Sample',
    provenance: {
      origin: 'Sample PDF Extraction Pipeline',
      pageReference: 'Page 1 · Section 2 (Applicant Details)',
      extractionMethod: 'Structured PDF Text Parser',
      rawExcerpt: 'Applicant Name: Rahul Kumar | Recorded Age: 25 years',
    },
    details:
      'Extracted entity "Rahul Kumar" and quantitative attribute claim AGE = 25 from demonstration PDF filing.',
  },
  {
    id: 'EVD-4D86453C03B7',
    modality: 'Excel',
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    source: 'hr_roster_spreadsheet.xlsx',
    sourceLabel: 'Excel Spreadsheet',
    claimSummary: 'Rahul Kumar age 28',
    subject: 'Rahul Kumar',
    predicate: 'AGE',
    value: '28',
    numericValue: 28,
    integrity: 'VERIFIED',
    datasetType: 'Demonstration Sample',
    provenance: {
      origin: 'Sample Spreadsheet Ingestion Pipeline',
      pageReference: 'Sheet1 · Row 4 · Columns B–C',
      extractionMethod: 'Tabular Cell Schema Mapper',
      rawExcerpt: 'Name: Rahul Kumar | Age: 28',
    },
    details:
      'Extracted entity "Rahul Kumar" and quantitative attribute claim AGE = 28 from demonstration Excel workbook.',
  },
  {
    id: 'EVD-A383CB349785',
    modality: 'Image/OCR',
    fileType: 'image/png',
    source: 'scanned_id_record.png',
    sourceLabel: 'Image Evidence',
    claimSummary: 'Rahul Kumar age 30',
    subject: 'Rahul Kumar',
    predicate: 'AGE',
    value: '30',
    numericValue: 30,
    integrity: 'VERIFIED',
    datasetType: 'Demonstration Sample',
    provenance: {
      origin: 'Sample OCR Extraction Pipeline',
      pageReference: 'Region [x:142, y:218] · Identity Field Block',
      extractionMethod: 'Optical Character Recognition (OCR)',
      rawExcerpt: 'SUBJECT: RAHUL KUMAR — AGE: 30',
    },
    details:
      'Extracted entity "Rahul Kumar" and quantitative attribute claim AGE = 30 from demonstration scanned image.',
  },
];

export const extractedClaims = evidenceRecords.map((record, index) => ({
  id: `CLM-DEMO-00${index + 1}`,
  isDemonstrationId: true,
  subject: record.subject,
  predicate: record.predicate,
  value: record.value,
  formattedClaim: `${record.subject} — ${record.predicate} — ${record.value}`,
  sourceEvidenceId: record.id,
  sourceName: record.source,
  modality: record.modality,
  integrity: record.integrity,
  datasetType: 'Demonstration Sample',
}));

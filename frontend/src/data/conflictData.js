export const VERIFICATION_RULE =
  'Actual age cannot be determined from the available conflicting evidence. Human verification is required.';

export const AI_INVESTIGATION_PRINCIPLE =
  'The Python contradiction engine identifies conflicts. Local AI explains them. AI does not decide which evidence is true.';

export const SAMPLE_AI_EXPLANATION =
  'The available sources report different ages for Rahul Kumar: 25, 28 and 30. These disagreements are classified as VALUE_CONFLICT. The actual age cannot be determined without further verification.';

export const PENDING_AI_MESSAGE =
  'Backend integration pending. Connect the local FastAPI and Ollama services to generate a live explanation.';

export const conflictRecords = [
  {
    id: 'CONF-DEMO-001',
    isDemonstrationId: true,
    idLabel: 'Demonstration ID',
    conflictType: 'VALUE_CONFLICT',
    subject: 'Rahul Kumar',
    predicate: 'AGE',
    title: 'PDF age 25 versus Excel age 28',
    claimA: 'Rahul Kumar — AGE — 25',
    claimB: 'Rahul Kumar — AGE — 28',
    valueA: '25',
    valueB: '28',
    sourceA: {
      evidenceId: 'EVD-8510526DFC1B',
      modality: 'PDF',
      fileName: 'corporate_registry_filing.pdf',
      excerpt: 'Applicant Name: Rahul Kumar | Recorded Age: 25 years',
    },
    sourceB: {
      evidenceId: 'EVD-4D86453C03B7',
      modality: 'Excel',
      fileName: 'hr_roster_spreadsheet.xlsx',
      excerpt: 'Name: Rahul Kumar | Age: 28',
    },
    varianceSummary: '3-year numeric divergence between PDF filing and Excel roster',
    ruleNotice: VERIFICATION_RULE,
    sampleExplanation:
      'The PDF filing (EVD-8510526DFC1B) states Rahul Kumar is age 25, while the Excel roster (EVD-4D86453C03B7) states age 28. This 3-year discrepancy is classified as a VALUE_CONFLICT requiring human verification.',
  },
  {
    id: 'CONF-DEMO-002',
    isDemonstrationId: true,
    idLabel: 'Demonstration ID',
    conflictType: 'VALUE_CONFLICT',
    subject: 'Rahul Kumar',
    predicate: 'AGE',
    title: 'PDF age 25 versus Image age 30',
    claimA: 'Rahul Kumar — AGE — 25',
    claimB: 'Rahul Kumar — AGE — 30',
    valueA: '25',
    valueB: '30',
    sourceA: {
      evidenceId: 'EVD-8510526DFC1B',
      modality: 'PDF',
      fileName: 'corporate_registry_filing.pdf',
      excerpt: 'Applicant Name: Rahul Kumar | Recorded Age: 25 years',
    },
    sourceB: {
      evidenceId: 'EVD-A383CB349785',
      modality: 'Image/OCR',
      fileName: 'scanned_id_record.png',
      excerpt: 'SUBJECT: RAHUL KUMAR — AGE: 30',
    },
    varianceSummary: '5-year numeric divergence between PDF filing and Image/OCR scan',
    ruleNotice: VERIFICATION_RULE,
    sampleExplanation:
      'The PDF filing (EVD-8510526DFC1B) records age 25, whereas the OCR extraction from the scanned image (EVD-A383CB349785) records age 30. This 5-year discrepancy is classified as a VALUE_CONFLICT.',
  },
  {
    id: 'CONF-DEMO-003',
    isDemonstrationId: true,
    idLabel: 'Demonstration ID',
    conflictType: 'VALUE_CONFLICT',
    subject: 'Rahul Kumar',
    predicate: 'AGE',
    title: 'Excel age 28 versus Image age 30',
    claimA: 'Rahul Kumar — AGE — 28',
    claimB: 'Rahul Kumar — AGE — 30',
    valueA: '28',
    valueB: '30',
    sourceA: {
      evidenceId: 'EVD-4D86453C03B7',
      modality: 'Excel',
      fileName: 'hr_roster_spreadsheet.xlsx',
      excerpt: 'Name: Rahul Kumar | Age: 28',
    },
    sourceB: {
      evidenceId: 'EVD-A383CB349785',
      modality: 'Image/OCR',
      fileName: 'scanned_id_record.png',
      excerpt: 'SUBJECT: RAHUL KUMAR — AGE: 30',
    },
    varianceSummary: '2-year numeric divergence between Excel roster and Image/OCR scan',
    ruleNotice: VERIFICATION_RULE,
    sampleExplanation:
      'The Excel spreadsheet (EVD-4D86453C03B7) lists age 28, while the scanned image OCR output (EVD-A383CB349785) lists age 30. This 2-year discrepancy is classified as a VALUE_CONFLICT.',
  },
];

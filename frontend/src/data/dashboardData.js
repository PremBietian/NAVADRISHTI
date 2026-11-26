export const dashboardStats = [
  {
    key: 'totalEvidence',
    label: 'Total Evidence Records',
    value: 3,
    detail: 'Demonstration dataset',
    tone: 'neutral',
  },
  {
    key: 'verifiedEvidence',
    label: 'Verified Evidence',
    value: 3,
    detail: 'Demonstration status',
    tone: 'emerald',
  },
  {
    key: 'excludedEvidence',
    label: 'Excluded Evidence',
    value: 0,
    detail: 'Zero excluded files',
    tone: 'neutral',
  },
  {
    key: 'totalEntities',
    label: 'Total Entities',
    value: 3,
    detail: '3 source-level entity records',
    tone: 'accent',
  },
  {
    key: 'totalClaims',
    label: 'Total Claims',
    value: 3,
    detail: 'Extracted AGE claims',
    tone: 'blue',
  },
  {
    key: 'detectedConflicts',
    label: 'Detected Conflicts',
    value: 3,
    detail: 'Pairwise VALUE_CONFLICT',
    tone: 'amber',
  },
];

export const ageComparisonChartData = [
  {
    source: 'PDF',
    evidenceId: 'EVD-8510526DFC1B',
    reportedAge: 25,
    fill: '#60A5FA',
  },
  {
    source: 'Excel',
    evidenceId: 'EVD-4D86453C03B7',
    reportedAge: 28,
    fill: '#34D399',
  },
  {
    source: 'Image/OCR',
    evidenceId: 'EVD-A383CB349785',
    reportedAge: 30,
    fill: '#A6FF78',
  },
];

export const conflictVarianceChartData = [
  {
    pair: 'PDF vs Excel',
    varianceYears: 3,
    conflictType: 'VALUE_CONFLICT',
  },
  {
    pair: 'PDF vs Image',
    varianceYears: 5,
    conflictType: 'VALUE_CONFLICT',
  },
  {
    pair: 'Excel vs Image',
    varianceYears: 2,
    conflictType: 'VALUE_CONFLICT',
  },
];

export const systemStatusItems = [
  {
    service: 'Frontend',
    status: 'Running',
    state: 'running',
    description: 'React + Vite client demonstration interface active.',
  },
  {
    service: 'FastAPI',
    status: 'Not connected',
    state: 'disconnected',
    description: 'Target endpoint http://127.0.0.1:8000 prepared in api.js.',
  },
  {
    service: 'Local AI',
    status: 'Not connected',
    state: 'disconnected',
    description: 'Ollama explanation service awaits local backend connection.',
  },
];

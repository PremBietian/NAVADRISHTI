export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export function detectEvidenceModality(fileName: string): {
  valid: boolean;
  modality: string;
  extension: string;
} {
  const parts = fileName.split('.');
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : '';

  switch (ext) {
    case 'pdf':
      return { valid: true, modality: 'PDF Document', extension: 'PDF' };
    case 'xlsx':
      return { valid: true, modality: 'Excel Spreadsheet', extension: 'XLSX' };
    case 'png':
    case 'jpg':
    case 'jpeg':
      return { valid: true, modality: 'Image / OCR', extension: ext.toUpperCase() };
    default:
      return { valid: false, modality: 'Unsupported', extension: ext.toUpperCase() || 'FILE' };
  }
}

export function getModalityColorClass(modality: string): string {
  if (modality === 'PDF') return 'text-[#60A5FA]';
  if (modality === 'Excel') return 'text-[#34D399]';
  if (modality === 'Image/OCR') return 'text-[#A6FF78]';
  return 'text-[#9AA69E]';
}

import { ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { StatusIndicator } from './StatusIndicator';
import { integrityRecords } from '../data/integrityData';

export interface EvidenceRecordItem {
  id: string;
  modality: string;
  fileType: string;
  source: string;
  sourceLabel: string;
  claimSummary: string;
  subject: string;
  predicate: string;
  value: string;
  integrity: string;
  datasetType: string;
  provenance: {
    origin: string;
    pageReference: string;
    extractionMethod: string;
    rawExcerpt: string;
  };
  details: string;
}

interface EvidenceDetailModalProps {
  record: EvidenceRecordItem | null;
  onClose: () => void;
}

export function EvidenceDetailModal({ record, onClose }: EvidenceDetailModalProps) {
  if (!record) return null;

  const integrityInfo = (integrityRecords as Record<string, any>)[record.id];

  return (
    <Modal
      isOpen={Boolean(record)}
      onClose={onClose}
      title={`Evidence Record · ${record.id}`}
      subtitle={`${record.sourceLabel} · ${record.datasetType}`}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Core Provenance Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-4">
            <p className="text-xs text-[#9AA69E]">Source File</p>
            <p className="mt-1 font-mono text-sm font-medium text-[#F5F7F5] break-all">
              {record.source}
            </p>
            <p className="mt-2 text-xs text-[#7D8A82]">{record.provenance.pageReference}</p>
          </div>
          <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-4">
            <p className="text-xs text-[#9AA69E]">Extracted Claim</p>
            <p className="mt-1 text-sm font-semibold text-[#A6FF78]">{record.claimSummary}</p>
            <p className="mt-2 text-xs text-[#7D8A82]">{record.provenance.extractionMethod}</p>
          </div>
        </div>

        {/* Raw Excerpt */}
        <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-4">
          <p className="text-xs font-medium text-[#9AA69E]">Extracted Provenance Excerpt</p>
          <p className="mt-2 rounded-lg border border-[#1E2923] bg-[#070908] px-3.5 py-2.5 font-mono text-xs text-[#F5F7F5]">
            {record.provenance.rawExcerpt}
          </p>
          <p className="mt-2.5 text-xs leading-relaxed text-[#9AA69E]">{record.details}</p>
        </div>

        {/* Digital Evidence Integrity Section */}
        <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#34D399]" aria-hidden="true" />
              <h4 className="text-sm font-semibold text-[#F5F7F5]">
                Digital Evidence Integrity (SHA-256)
              </h4>
            </div>
            <StatusIndicator
              label={integrityInfo?.integrityStatus || record.integrity}
              sublabel={integrityInfo?.datasetLabel || 'Demonstration Status'}
              tone="verified"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[#1E2923] bg-[#070908] p-3">
              <p className="text-xs text-[#9AA69E]">Expected Hash (SHA-256)</p>
              <p className="mt-1 font-mono text-xs text-[#F5F7F5]">
                {integrityInfo?.expectedHash || 'Hash available after backend integration.'}
              </p>
            </div>
            <div className="rounded-lg border border-[#1E2923] bg-[#070908] p-3">
              <p className="text-xs text-[#9AA69E]">Calculated Hash (SHA-256)</p>
              <p className="mt-1 font-mono text-xs text-[#F5F7F5]">
                {integrityInfo?.calculatedHash || 'Hash available after backend integration.'}
              </p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-[#9AA69E]">
            {integrityInfo?.verificationExplanation}
          </p>
        </div>

        <div className="flex justify-end border-t border-[#222E27] pt-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Details
          </Button>
        </div>
      </div>
    </Modal>
  );
}

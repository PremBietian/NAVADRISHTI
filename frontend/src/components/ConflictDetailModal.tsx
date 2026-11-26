import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { StatusIndicator } from './StatusIndicator';

export interface ConflictRecordItem {
  id: string;
  isDemonstrationId: boolean;
  idLabel: string;
  conflictType: string;
  subject: string;
  predicate: string;
  title: string;
  claimA: string;
  claimB: string;
  valueA: string;
  valueB: string;
  sourceA: {
    evidenceId: string;
    modality: string;
    fileName: string;
    excerpt: string;
  };
  sourceB: {
    evidenceId: string;
    modality: string;
    fileName: string;
    excerpt: string;
  };
  varianceSummary: string;
  ruleNotice: string;
  sampleExplanation: string;
}

interface ConflictDetailModalProps {
  conflict: ConflictRecordItem | null;
  onClose: () => void;
  onExplainConflict: (conflict: ConflictRecordItem) => void;
}

export function ConflictDetailModal({
  conflict,
  onClose,
  onExplainConflict,
}: ConflictDetailModalProps) {
  if (!conflict) return null;

  return (
    <Modal
      isOpen={Boolean(conflict)}
      onClose={onClose}
      title={`Conflict Analysis · ${conflict.id}`}
      subtitle={`${conflict.idLabel} · ${conflict.conflictType}`}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-base font-semibold text-[#F5F7F5]">{conflict.title}</p>
          <StatusIndicator label={conflict.conflictType} tone="conflict" />
        </div>

        {/* Pairwise Comparison */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-4 space-y-2">
            <p className="text-xs font-medium text-[#60A5FA]">
              Source A · {conflict.sourceA.modality}
            </p>
            <p className="font-mono text-xs text-[#9AA69E]">{conflict.sourceA.evidenceId}</p>
            <p className="text-sm font-semibold text-[#F5F7F5]">{conflict.claimA}</p>
            <p className="rounded-lg border border-[#1E2923] bg-[#070908] px-3 py-2 font-mono text-xs text-[#9AA69E]">
              {conflict.sourceA.excerpt}
            </p>
          </div>

          <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-4 space-y-2">
            <p className="text-xs font-medium text-[#A6FF78]">
              Source B · {conflict.sourceB.modality}
            </p>
            <p className="font-mono text-xs text-[#9AA69E]">{conflict.sourceB.evidenceId}</p>
            <p className="text-sm font-semibold text-[#F5F7F5]">{conflict.claimB}</p>
            <p className="rounded-lg border border-[#1E2923] bg-[#070908] px-3 py-2 font-mono text-xs text-[#9AA69E]">
              {conflict.sourceB.excerpt}
            </p>
          </div>
        </div>

        {/* Summary & Investigation Rule */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <div className="space-y-1 text-xs leading-relaxed">
            <p className="font-semibold text-amber-200">Verification Rule</p>
            <p className="text-amber-100/90">{conflict.ruleNotice}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-4">
          <p className="text-xs font-medium text-[#9AA69E]">Sample Demonstration Summary</p>
          <p className="mt-1.5 text-sm leading-relaxed text-[#F5F7F5]">
            {conflict.sampleExplanation}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#222E27] pt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              onExplainConflict(conflict);
            }}
          >
            <span>Explain Conflict</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}

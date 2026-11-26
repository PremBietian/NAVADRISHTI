import { ArrowRight } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { StatusIndicator } from './StatusIndicator';
import type { ConflictRecordItem } from './ConflictDetailModal';

interface ConflictCardProps {
  conflict: ConflictRecordItem;
  onViewDetails: (conflict: ConflictRecordItem) => void;
  onExplainConflict: (conflict: ConflictRecordItem) => void;
}

export function ConflictCard({
  conflict,
  onViewDetails,
  onExplainConflict,
}: ConflictCardProps) {
  return (
    <Card className="p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#9AA69E]">
            <span className="font-mono font-medium text-[#F5F7F5]">{conflict.id}</span>
            <span aria-hidden="true">·</span>
            <span>{conflict.idLabel}</span>
          </div>
          <h3 className="text-base font-semibold text-[#F5F7F5]">{conflict.title}</h3>
        </div>
        <StatusIndicator label={conflict.conflictType} tone="conflict" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[#222E27] bg-[#0D110F] p-3.5">
          <p className="text-xs text-[#60A5FA]">
            Source A · {conflict.sourceA.modality} ({conflict.sourceA.evidenceId})
          </p>
          <p className="mt-1 text-sm font-medium text-[#F5F7F5]">{conflict.claimA}</p>
        </div>

        <div className="rounded-lg border border-[#222E27] bg-[#0D110F] p-3.5">
          <p className="text-xs text-[#A6FF78]">
            Source B · {conflict.sourceB.modality} ({conflict.sourceB.evidenceId})
          </p>
          <p className="mt-1 text-sm font-medium text-[#F5F7F5]">{conflict.claimB}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#222E27] pt-4">
        <p className="text-xs text-[#9AA69E]">{conflict.varianceSummary}</p>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={() => onViewDetails(conflict)}>
            View Details
          </Button>
          <Button variant="primary" size="sm" onClick={() => onExplainConflict(conflict)}>
            <span>Explain Conflict</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

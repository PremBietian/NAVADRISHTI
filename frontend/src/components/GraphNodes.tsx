import { Handle, Position } from '@xyflow/react';
import { FileSpreadsheet, FileText, Image as ImageIcon, Scale, User } from 'lucide-react';

interface BaseNodeProps {
  data: any;
  selected?: boolean;
}

export function EvidenceGraphNode({ data, selected }: BaseNodeProps) {
  const Icon =
    data.modality === 'PDF'
      ? FileText
      : data.modality === 'Excel'
      ? FileSpreadsheet
      : ImageIcon;

  const isDimmed = data.dimmed;

  return (
    <div
      className={`min-w-[215px] rounded-xl border bg-[#121916] px-4 py-3 shadow-lg transition-all duration-150 ${
        selected || data.highlighted
          ? 'border-[#60A5FA] ring-2 ring-[#60A5FA]/30'
          : 'border-[#60A5FA]/45 hover:border-[#60A5FA]'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#60A5FA]/15 text-[#60A5FA]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#60A5FA]">Evidence · {data.modality}</p>
          <p className="truncate text-sm font-semibold text-[#F5F7F5]">{data.label}</p>
        </div>
      </div>
      <p className="mt-2 font-mono text-[11px] text-[#9AA69E]">{data.sublabel}</p>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-[#070908] !bg-[#60A5FA]"
      />
    </div>
  );
}

export function EntityGraphNode({ data, selected }: BaseNodeProps) {
  const isDimmed = data.dimmed;

  return (
    <div
      className={`min-w-[230px] rounded-xl border bg-[#18211C] px-5 py-4 shadow-[0_0_28px_rgba(166,255,120,0.12)] transition-all duration-150 ${
        selected || data.highlighted
          ? 'border-[#A6FF78] ring-2 ring-[#A6FF78]/35'
          : 'border-[#A6FF78]/60 hover:border-[#A6FF78]'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-[#070908] !bg-[#A6FF78]"
      />
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#A6FF78]/15 text-[#A6FF78]">
          <User className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#A6FF78]">Resolved Entity</p>
          <p className="truncate text-base font-bold text-[#F5F7F5]">{data.label}</p>
        </div>
      </div>
      <p className="mt-2.5 text-xs text-[#9AA69E] tabular-nums">
        {data.sourceEntityRecords} source records · {data.conflictsDetected} conflicts
      </p>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-[#070908] !bg-[#A6FF78]"
      />
    </div>
  );
}

export function ClaimGraphNode({ data, selected }: BaseNodeProps) {
  const isDimmed = data.dimmed;

  return (
    <div
      className={`min-w-[210px] rounded-xl border bg-[#121916] px-4 py-3 shadow-lg transition-all duration-150 ${
        selected || data.highlighted
          ? 'border-amber-400 ring-2 ring-amber-400/30'
          : 'border-amber-400/50 hover:border-amber-400'
      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-[#070908] !bg-amber-400"
      />
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-400">
          <Scale className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-amber-400">Extracted Claim</p>
          <p className="truncate font-mono text-sm font-semibold text-[#F5F7F5]">{data.label}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-[#9AA69E]">{data.sublabel}</p>
    </div>
  );
}

export const graphNodeTypes = {
  evidenceNode: EvidenceGraphNode,
  entityNode: EntityGraphNode,
  claimNode: ClaimGraphNode,
};

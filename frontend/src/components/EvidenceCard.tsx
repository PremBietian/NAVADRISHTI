import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { StatusIndicator } from './StatusIndicator';
import type { EvidenceRecordItem } from './EvidenceDetailModal';
import { getModalityColorClass } from '../utils/formatters';

interface EvidenceCardProps {
  record: EvidenceRecordItem;
  onInspect: (record: EvidenceRecordItem) => void;
}

export function EvidenceCard({ record, onInspect }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const Icon =
    record.modality === 'PDF'
      ? FileText
      : record.modality === 'Excel'
      ? FileSpreadsheet
      : ImageIcon;

  return (
    <Card className="overflow-hidden">
      <div className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#222E27] bg-[#0D110F]">
            <Icon className={`h-5 w-5 ${getModalityColorClass(record.modality)}`} aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#9AA69E]">
              <span className="font-mono font-medium text-[#F5F7F5]">{record.id}</span>
              <span aria-hidden="true">·</span>
              <span className={getModalityColorClass(record.modality)}>{record.modality}</span>
              <span aria-hidden="true">·</span>
              <span>{record.datasetType}</span>
            </div>
            <h3 className="text-base font-semibold text-[#F5F7F5] truncate">
              {record.claimSummary}
            </h3>
            <p className="font-mono text-xs text-[#9AA69E] truncate">{record.source}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <StatusIndicator label={record.integrity} tone="verified" />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            <span>{expanded ? 'Hide Details' : 'Expand'}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-150 ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onInspect(record)}>
            Inspect Integrity
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[#222E27] bg-[#0D110F]"
          >
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 text-xs">
              <div>
                <p className="text-[#9AA69E]">Provenance Origin</p>
                <p className="mt-1 font-medium text-[#F5F7F5]">{record.provenance.origin}</p>
                <p className="mt-1 text-[#7D8A82]">{record.provenance.pageReference}</p>
              </div>
              <div>
                <p className="text-[#9AA69E]">Extraction Method</p>
                <p className="mt-1 font-medium text-[#F5F7F5]">
                  {record.provenance.extractionMethod}
                </p>
                <p className="mt-1 font-mono text-[#7D8A82]">{record.fileType}</p>
              </div>
              <div>
                <p className="text-[#9AA69E]">Extracted Excerpt</p>
                <p className="mt-1 rounded-md border border-[#1E2923] bg-[#070908] px-2.5 py-1.5 font-mono text-[#F5F7F5]">
                  {record.provenance.rawExcerpt}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

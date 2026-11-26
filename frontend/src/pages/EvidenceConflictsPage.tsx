
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, RefreshCw } from 'lucide-react';
import { Tabs } from '../components/Tabs';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { StatusIndicator } from '../components/StatusIndicator';
import { EvidenceCard } from '../components/EvidenceCard';
import {
  EvidenceDetailModal,
  type EvidenceRecordItem,
} from '../components/EvidenceDetailModal';
import { cerberusApi } from '../services/api';
import { getModalityColorClass } from '../utils/formatters';

const MODALITY_FILTERS = ['All', 'PDF', 'Excel', 'Image/OCR'];

type BackendRecord = {
  evidence_id: string;
  source_name: string;
  source_hash_sha256: string;
  author_provenance: string;
  verification_status: string;
  entities: Array<{ name: string }>;
  claims: Array<{
    claim_id: string;
    subject: string;
    predicate: string;
    object: string | number;
    verification_status: string;
    extraction_confidence?: number | null;
    source_location?: {
      page?: number | null;
      sheet?: string | null;
      row?: number | null;
    };
  }>;
  metadata: Record<string, any>;
};

type ClaimItem = {
  id: string;
  subject: string;
  predicate: string;
  value: string;
  modality: string;
  status: string;
  sourceEvidenceId: string;
  sourceName: string;
  formattedClaim: string;
};

type DifferenceItem = {
  subject: string;
  predicate: string;
  sourceA: BackendRecord;
  sourceB: BackendRecord;
  valueA: string;
  valueB: string;
};

function getModality(record: BackendRecord) {
  if (record.source_name.toLowerCase().endsWith('.xlsx') ||
      record.source_name.toLowerCase().endsWith('.xls')) return 'Excel';

  if (record.source_name.toLowerCase().match(/\.(png|jpg|jpeg|webp|bmp)$/)) {
    return 'Image/OCR';
  }

  return 'PDF';
}

function getOriginalName(record: BackendRecord) {
  return record.metadata?.original_filename || record.source_name;
}

function getLocation(claim: BackendRecord['claims'][number]) {
  const location = claim.source_location;
  if (!location) return 'Location not available';

  if (location.page) return `Page ${location.page}`;
  if (location.sheet) {
    return `Sheet: ${location.sheet}${location.row ? `, Row ${location.row}` : ''}`;
  }

  return 'Image region / OCR';
}

export function EvidenceConflictsPage() {
  const [activeTab, setActiveTab] = useState<'evidence' | 'claims' | 'conflicts'>('evidence');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalityFilter, setModalityFilter] = useState('All');
  const [records, setRecords] = useState<BackendRecord[]>([]);
  const [integrityResults, setIntegrityResults] = useState<any[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceRecordItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [resultsData, integrityData] = await Promise.all([
        cerberusApi.getResults(),
        cerberusApi.getIntegrity(),
      ]);

      setRecords(resultsData.records || []);
      setIntegrityResults(integrityData.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load backend evidence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const evidenceRecords = useMemo<EvidenceRecordItem[]>(() => {
    return records.map((record) => {
      const modality = getModality(record);
      const firstClaim = record.claims?.[0];
      const integrity = integrityResults.find(
        (item) => item.evidence_id === record.evidence_id
      );

      const claimSummary = record.claims?.length
        ? record.claims.map(
            (claim) => `${claim.subject}: ${claim.predicate} = ${claim.object}`
          ).join(' · ')
        : 'No claims extracted from this source';

      return {
        id: record.evidence_id,
        modality,
        fileType: record.source_name.split('.').pop()?.toUpperCase() || 'FILE',
        source: getOriginalName(record),
        sourceLabel: getOriginalName(record),
        claimSummary,
        subject: firstClaim?.subject || record.entities?.[0]?.name || 'No entity extracted',
        predicate: firstClaim?.predicate || 'N/A',
        value: firstClaim ? String(firstClaim.object) : 'N/A',
        integrity: integrity?.status || 'UNKNOWN',
        datasetType: modality,
        provenance: {
          origin: record.author_provenance || 'Not provided',
          pageReference: firstClaim ? getLocation(firstClaim) : 'No claim location available',
          extractionMethod:
            record.metadata?.extractor ||
            record.metadata?.extraction_method ||
            'Backend extraction',
          rawExcerpt:
            record.metadata?.extracted_text ||
            claimSummary,
        },
        details: `Evidence ID: ${record.evidence_id}. Claim verification status: ${firstClaim?.verification_status || 'No claims extracted'}. File integrity status: ${integrity?.status || 'Unknown'}.`,
      };
    });
  }, [records, integrityResults]);

  const claims = useMemo<ClaimItem[]>(() => {
    return records.flatMap((record) =>
      (record.claims || []).map((claim) => ({
        id: claim.claim_id,
        subject: claim.subject,
        predicate: claim.predicate,
        value: String(claim.object),
        modality: getModality(record),
        status: claim.verification_status,
        sourceEvidenceId: record.evidence_id,
        sourceName: getOriginalName(record),
        formattedClaim: `${claim.subject} ${claim.predicate} ${claim.object}`,
      }))
    );
  }, [records]);

  const differences = useMemo<DifferenceItem[]>(() => {
    const grouped = new Map<string, Array<{ record: BackendRecord; value: string }>>();

    records.forEach((record) => {
      (record.claims || []).forEach((claim) => {
        const key = `${claim.subject.toLowerCase()}|${claim.predicate.toLowerCase()}`;
        const existing = grouped.get(key) || [];
        existing.push({ record, value: String(claim.object) });
        grouped.set(key, existing);
      });
    });

    const output: DifferenceItem[] = [];

    grouped.forEach((items) => {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          if (items[i].value !== items[j].value) {
            const claim = items[i].record.claims.find(
              (item) => item.subject.toLowerCase() === items[j].record.claims.find(
                (other) => other.subject.toLowerCase() === item.subject.toLowerCase()
              )?.subject.toLowerCase()
            );

            output.push({
              subject: claim?.subject || items[i].record.entities?.[0]?.name || 'Unknown',
              predicate: claim?.predicate || 'Unknown',
              sourceA: items[i].record,
              sourceB: items[j].record,
              valueA: items[i].value,
              valueB: items[j].value,
            });
          }
        }
      }
    });

    return output;
  }, [records]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchesModality = (modality: string) =>
    modalityFilter === 'All' || modality === modalityFilter;

  const filteredEvidence = evidenceRecords.filter((item) =>
    matchesModality(item.modality) &&
    (!normalizedQuery ||
      `${item.id} ${item.source} ${item.claimSummary} ${item.modality}`
        .toLowerCase().includes(normalizedQuery))
  );

  const filteredClaims = claims.filter((claim) =>
    matchesModality(claim.modality) &&
    (!normalizedQuery ||
      `${claim.formattedClaim} ${claim.sourceEvidenceId} ${claim.sourceName}`
        .toLowerCase().includes(normalizedQuery))
  );

  const filteredDifferences = differences.filter((item) => {
    const modalityMatch =
      modalityFilter === 'All' ||
      matchesModality(getModality(item.sourceA)) ||
      matchesModality(getModality(item.sourceB));

    const queryMatch =
      !normalizedQuery ||
      `${item.subject} ${item.predicate} ${item.valueA} ${item.valueB} ${item.sourceA.evidence_id} ${item.sourceB.evidence_id}`
        .toLowerCase().includes(normalizedQuery);

    return modalityMatch && queryMatch;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setModalityFilter('All');
  };

  const selectedSource = (id: string) =>
    evidenceRecords.find((record) => record.id === id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F7F5] sm:text-3xl">
            Evidence & Conflicts
          </h1>
          <p className="text-sm text-[#9AA69E]">
            Explore live evidence records, extracted claims and observed differences across sources.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-[#222E27] bg-[#0D110F] px-4 py-2 text-sm text-[#A6FF78] transition hover:bg-[#18211C] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-950/15 px-4 py-3.5 text-xs leading-relaxed text-amber-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p>
          <span className="font-semibold text-amber-300">Investigation Principle:</span>{' '}
          A matching SHA-256 hash confirms file integrity, not the truth of its contents.
          Extracted claims remain unverified until independently assessed.
        </p>
      </div>

      {error && (
        <Card className="border-red-500/30 p-5">
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={loadData} className="mt-3 text-sm text-[#A6FF78] hover:underline">
            Try again
          </button>
        </Card>
      )}

      {loading ? (
        <Card className="p-10 text-center">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#A6FF78]" />
          <p className="mt-3 text-sm text-[#9AA69E]">Loading live evidence from CERBERUS-X...</p>
        </Card>
      ) : !error && (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              layoutId="evidence-conflicts-tab"
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as 'evidence' | 'claims' | 'conflicts')}
              tabs={[
                { id: 'evidence', label: 'Evidence Records', count: filteredEvidence.length },
                { id: 'claims', label: 'Extracted Claims', count: filteredClaims.length },
                { id: 'conflicts', label: 'Observed Differences', count: filteredDifferences.length },
              ]}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA69E]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search ID, source, or claim..."
                  className="w-full rounded-lg border border-[#222E27] bg-[#0D110F] py-2 pl-9 pr-3 text-sm text-[#F5F7F5] placeholder-[#6E7B73] focus:border-[#A6FF78] focus:outline-none sm:w-64"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-[#222E27] bg-[#0D110F] p-1">
                {MODALITY_FILTERS.map((modality) => (
                  <button
                    key={modality}
                    type="button"
                    onClick={() => setModalityFilter(modality)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                      modalityFilter === modality
                        ? 'bg-[#18211C] text-[#A6FF78]'
                        : 'text-[#9AA69E] hover:text-[#F5F7F5]'
                    }`}
                  >
                    {modality}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {filteredEvidence.length === 0 ? (
                <EmptyState
                  title="No matching evidence records"
                  description="Try clearing your search or changing the modality filter."
                  actionLabel="Reset Filters"
                  onAction={resetFilters}
                />
              ) : filteredEvidence.map((record) => (
                <EvidenceCard
                  key={record.id}
                  record={record}
                  onInspect={setSelectedEvidence}
                />
              ))}
            </div>
          )}

          {activeTab === 'claims' && (
            filteredClaims.length === 0 ? (
              <EmptyState
                title="No matching extracted claims"
                description="No claims match the current filters."
                actionLabel="Reset Filters"
                onAction={resetFilters}
              />
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#222E27] bg-[#0D110F] text-xs text-[#9AA69E]">
                        <th className="px-5 py-3.5">Subject</th>
                        <th className="px-5 py-3.5">Predicate</th>
                        <th className="px-5 py-3.5">Value</th>
                        <th className="px-5 py-3.5">Source Evidence</th>
                        <th className="px-5 py-3.5">Modality</th>
                        <th className="px-5 py-3.5">Claim Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222E27]">
                      {filteredClaims.map((claim) => (
                        <tr key={claim.id} className="transition-colors hover:bg-[#151E1A]">
                          <td className="px-5 py-4 font-medium text-[#F5F7F5]">{claim.subject}</td>
                          <td className="px-5 py-4 font-mono text-xs text-amber-400">{claim.predicate}</td>
                          <td className="px-5 py-4 font-mono font-semibold text-[#A6FF78]">{claim.value}</td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => {
                                const source = selectedSource(claim.sourceEvidenceId);
                                if (source) setSelectedEvidence(source);
                              }}
                              className="font-mono text-xs text-[#60A5FA] hover:underline"
                            >
                              {claim.sourceEvidenceId}
                            </button>
                            <p className="mt-1 text-xs text-[#9AA69E]">{claim.sourceName}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-medium ${getModalityColorClass(claim.modality)}`}>
                              {claim.modality}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="rounded-md border border-amber-500/30 bg-amber-950/20 px-2 py-1 text-xs text-amber-300">
                              {claim.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          )}

          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              <p className="text-xs text-[#9AA69E]">
                These are pairwise differences calculated from extracted claims.
                They are not confirmed backend conflict classifications.
              </p>

              {filteredDifferences.length === 0 ? (
                <EmptyState
                  title="No observed differences"
                  description="No differing values were found for matching subjects and predicates."
                  actionLabel="Reset Filters"
                  onAction={resetFilters}
                />
              ) : filteredDifferences.map((item, index) => (
                <Card key={`${item.sourceA.evidence_id}-${item.sourceB.evidence_id}-${index}`} className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#9AA69E]">Observed Difference · Review Required</p>
                      <h3 className="mt-1 text-base font-semibold text-[#F5F7F5]">
                        {item.subject} — {item.predicate}
                      </h3>
                    </div>
                    <StatusIndicator label="Observed difference" tone="conflict" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-[#222E27] bg-[#0D110F] p-4">
                      <p className="text-xs text-[#60A5FA]">Source A · {getModality(item.sourceA)}</p>
                      <p className="mt-1 text-sm font-medium text-[#F5F7F5]">{getOriginalName(item.sourceA)}</p>
                      <p className="mt-2 font-mono text-xl font-semibold text-[#60A5FA]">{item.valueA}</p>
                      <p className="mt-1 font-mono text-xs text-[#9AA69E]">{item.sourceA.evidence_id}</p>
                    </div>
                    <div className="rounded-lg border border-[#222E27] bg-[#0D110F] p-4">
                      <p className="text-xs text-[#A6FF78]">Source B · {getModality(item.sourceB)}</p>
                      <p className="mt-1 text-sm font-medium text-[#F5F7F5]">{getOriginalName(item.sourceB)}</p>
                      <p className="mt-2 font-mono text-xl font-semibold text-[#A6FF78]">{item.valueB}</p>
                      <p className="mt-1 font-mono text-xs text-[#9AA69E]">{item.sourceB.evidence_id}</p>
                    </div>
                  </div>

                  <p className="border-t border-[#222E27] pt-3 text-xs text-[#9AA69E]">
                    Difference: {Math.abs(Number(item.valueA) - Number(item.valueB))} ·
                    Human review required before drawing conclusions.
                  </p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <EvidenceDetailModal
        record={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  );
}

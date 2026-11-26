
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Info,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatCard } from '../components/StatCard';
import { StatusIndicator } from '../components/StatusIndicator';
import {
  EvidenceDetailModal,
  type EvidenceRecordItem,
} from '../components/EvidenceDetailModal';
import { cerberusApi } from '../services/api';
import { getModalityColorClass } from '../utils/formatters';

interface Claim {
  claim_id?: string;
  subject?: string;
  predicate?: string;
  object?: string | number | null;
  polarity?: string;
  extraction_confidence?: number | null;
  source_location?: {
    page?: number | null;
    sheet?: string | null;
    row?: number | null;
  };
}

interface EvidenceRecord {
  evidence_id: string;
  source_name: string;
  modality: string;
  source_hash_sha256?: string;
  author_provenance?: string;
  ingested_at?: string;
  verification_status?: string;
  entities?: Array<{
    entity_id?: string;
    name?: string;
    entity_type?: string;
    attributes?: Record<string, unknown>;
  }>;
  claims?: Claim[];
  metadata?: Record<string, any>;
}

interface ResultsResponse {
  project?: string;
  summary?: {
    total_evidence_records?: number;
    verified_evidence_records?: number;
    excluded_evidence_records?: number;
    total_entities?: number;
    total_claims?: number;
    tracked_file_paths?: number;
  };
  records?: EvidenceRecord[];
}

interface IntegrityRecord {
  evidence_id?: string;
  source_name?: string;
  status?: string;
  expected_hash?: string;
  calculated_hash?: string;
  explanation?: string;
  is_verified?: boolean;
}

interface IntegrityResponse {
  integrity_engine?: string;
  summary?: {
    total_files?: number;
    verified_files?: number;
    unverified_files?: number;
    status_counts?: Record<string, number>;
  };
  results?: IntegrityRecord[];
}

interface ServiceState {
  health: boolean;
  integrity: boolean;
  ai: boolean;
}

const formatModality = (modality = '') => {
  const value = modality.toUpperCase();

  if (value.includes('XLS') || value.includes('EXCEL')) return 'Excel';
  if (value.includes('IMAGE')) return 'Image';
  return 'PDF';
};

const getSourceLabel = (record: EvidenceRecord) =>
  record.metadata?.original_filename || record.source_name || 'Unknown source';

const getClaimSummary = (record: EvidenceRecord) => {
  const claim = record.claims?.[0];

  if (!claim) return 'No claims extracted';

  return `${claim.predicate || 'Claim'}: ${String(claim.object ?? 'Unknown')}`;
};

const getSourceLocation = (claim?: Claim) => {
  if (!claim?.source_location) return 'Location not available';

  const location = claim.source_location;

  if (location.page) return `Page ${location.page}`;

  if (location.sheet) {
    return `Sheet: ${location.sheet}${location.row ? `, Row ${location.row}` : ''}`;
  }

  return 'Source location recorded';
};

const getFileIcon = (modality: string) => {
  if (modality === 'Excel') return FileSpreadsheet;
  if (modality === 'Image') return ImageIcon;
  return FileText;
};

export function DashboardPage() {
  const navigate = useNavigate();

  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityResponse | null>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);

  const [services, setServices] = useState<ServiceState>({
    health: false,
    integrity: false,
    ai: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvidence, setSelectedEvidence] =
    useState<EvidenceRecordItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      const [
        healthResult,
        resultsResult,
        integrityResult,
        aiResult,
      ] = await Promise.allSettled([
        cerberusApi.getHealth(),
        cerberusApi.getResults(),
        cerberusApi.getIntegrity(),
        cerberusApi.getAiStatus(),
      ]);

      if (!active) return;

      if (resultsResult.status === 'fulfilled') {
        setResults(resultsResult.value);
      } else {
        setError('Could not load evidence records from the backend.');
      }

      if (integrityResult.status === 'fulfilled') {
        setIntegrity(integrityResult.value);
      }

      if (aiResult.status === 'fulfilled') {
        setAiStatus(aiResult.value);
      }

      setServices({
        health: healthResult.status === 'fulfilled',
        integrity: integrityResult.status === 'fulfilled',
        ai:
          aiResult.status === 'fulfilled' &&
          Boolean(aiResult.value?.available) &&
          Boolean(aiResult.value?.model_available),
      });

      setLoading(false);
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const records = results?.records || [];
  const summary = results?.summary || {};
  const integritySummary = integrity?.summary;

  const integrityByEvidence = useMemo(() => {
    const map = new Map<string, IntegrityRecord>();

    (integrity?.results || []).forEach((item) => {
      if (item.evidence_id) {
        map.set(item.evidence_id, item);
      }
    });

    return map;
  }, [integrity]);

  const evidenceItems: EvidenceRecordItem[] = records.map((record) => {
    const claim = record.claims?.[0];
    const modality = formatModality(record.modality);
    const integrityRecord = integrityByEvidence.get(record.evidence_id);

    return {
      id: record.evidence_id,
      modality,
      fileType: modality,
      source: record.source_name,
      sourceLabel: getSourceLabel(record),
      claimSummary: getClaimSummary(record),
      subject: claim?.subject || record.entities?.[0]?.name || 'No entity',
      predicate: claim?.predicate || 'No claim',
      value: String(claim?.object ?? 'N/A'),
      integrity: integrityRecord?.status || 'UNKNOWN',
      datasetType: 'Live backend evidence',
      provenance: {
        origin: record.author_provenance || 'Not provided',
        pageReference: getSourceLocation(claim),
        extractionMethod:
          record.metadata?.extraction_method ||
          record.metadata?.extractor ||
          'Backend extraction',
        rawExcerpt:
          record.metadata?.extracted_text ||
          (claim
            ? `${claim.subject} — ${claim.predicate}: ${claim.object}`
            : 'No extracted claim available.'),
      },
      details: `Evidence ID: ${record.evidence_id}`,
    };
  });

  const allClaims = records.flatMap((record) =>
    (record.claims || []).map((claim) => ({
      ...claim,
      source: getSourceLabel(record),
      evidenceId: record.evidence_id,
    }))
  );

  const ageClaims = allClaims.filter(
    (claim) =>
      claim.predicate?.toUpperCase() === 'AGE' &&
      typeof claim.object === 'number'
  );

  const ageChartData = ageClaims.map((claim, index) => ({
    source: `Source ${index + 1}`,
    sourceName: claim.source,
    reportedAge: Number(claim.object),
    fill: ['#A6FF78', '#60A5FA', '#F59E0B', '#A78BFA'][index % 4],
  }));

  const observedDifferences = useMemo(() => {
    const differences: Array<{
      id: string;
      subject: string;
      predicate: string;
      firstSource: string;
      secondSource: string;
      firstValue: string;
      secondValue: string;
      difference: number;
    }> = [];

    for (let i = 0; i < ageClaims.length; i += 1) {
      for (let j = i + 1; j < ageClaims.length; j += 1) {
        const first = ageClaims[i];
        const second = ageClaims[j];

        if (
          first.subject?.toLowerCase() === second.subject?.toLowerCase() &&
          first.predicate === second.predicate &&
          first.object !== second.object
        ) {
          differences.push({
            id: `${first.evidenceId}-${second.evidenceId}`,
            subject: first.subject || 'Unknown subject',
            predicate: first.predicate || 'AGE',
            firstSource: first.source,
            secondSource: second.source,
            firstValue: String(first.object),
            secondValue: String(second.object),
            difference: Math.abs(
              Number(first.object) - Number(second.object)
            ),
          });
        }
      }
    }

    return differences;
  }, [ageClaims]);

  const differenceChartData = observedDifferences.map((item, index) => ({
    pair: `Pair ${index + 1}`,
    varianceYears: item.difference,
  }));

  const stats = [
    {
      key: 'evidence',
      label: 'Evidence Records',
      value: summary.total_evidence_records ?? records.length,
      detail: 'Records received from API',
      tone: 'neutral' as const,
    },
    {
      key: 'entities',
      label: 'Entities',
      value: summary.total_entities ?? 0,
      detail: 'Extracted entities',
      tone: 'blue' as const,
    },
    {
      key: 'claims',
      label: 'Claims',
      value: summary.total_claims ?? 0,
      detail: 'Extracted claims',
      tone: 'accent' as const,
    },
    {
      key: 'verified',
      label: 'Verified Files',
      value: integritySummary?.verified_files ?? 0,
      detail: 'SHA-256 matched files',
      tone: 'emerald' as const,
    },
    {
      key: 'excluded',
      label: 'Excluded Files',
      value: summary.excluded_evidence_records ?? 0,
      detail: 'Excluded by backend',
      tone: 'amber' as const,
    },
    {
      key: 'differences',
      label: 'Observed Differences',
      value: observedDifferences.length,
      detail: 'Calculated from extracted age claims',
      tone: 'amber' as const,
    },
  ];

  const integrityAlgorithm = integrity?.integrity_engine || 'Unavailable';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F7F5] sm:text-3xl">
            Investigation Overview
          </h1>
          <p className="mt-1.5 text-sm text-[#9AA69E]">
            Live evidence, extracted claims, integrity and system connectivity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#26342C] px-3 py-2 text-xs text-[#9AA69E] hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh data
          </button>

          <Button variant="secondary" size="sm" onClick={() => navigate('/evidence')}>
            <span>Inspect Evidence</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>

          <Button variant="primary" size="sm" onClick={() => navigate('/graph')}>
            View Knowledge Graph
          </Button>
        </div>
      </div>

      {/* Live Backend Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-[#26342C] bg-[#0D110F] px-4 py-3 text-xs text-[#9AA69E]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#60A5FA]" />
        <p>
          <span className="font-semibold text-[#F5F7F5]">
            Live backend data:
          </span>{' '}
          Dashboard information is retrieved from CERBERUS-X FastAPI services.
          Observed claim differences are comparisons, not automatic declarations
          of truth or confirmed backend conflict classifications.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-300">
          {error}
        </div>
      )}

      {/* Statistics */}
      <section
        aria-label="Investigation Statistics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        {stats.map((stat) => (
          <StatCard
            key={stat.key}
            label={stat.label}
            value={loading ? '...' : stat.value}
            detail={stat.detail}
            tone={stat.tone}
          />
        ))}
      </section>

      {/* Evidence and Claim Analysis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5 p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F5F7F5]">
                Evidence Overview
              </h2>
              <span className="text-xs text-[#9AA69E]">
                {loading ? 'Loading...' : `${records.length} live records`}
              </span>
            </div>

            <p className="mt-1 text-xs text-[#9AA69E]">
              Select a source to inspect extracted information and provenance.
            </p>

            <div className="mt-5 space-y-3">
              {!loading && evidenceItems.length === 0 && (
                <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-5 text-sm text-[#9AA69E]">
                  No evidence records are currently available.
                </div>
              )}

              {evidenceItems.map((record) => {
                const Icon = getFileIcon(record.modality);

                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setSelectedEvidence(record)}
                    className="w-full text-left flex items-center justify-between gap-3 rounded-xl border border-[#222E27] bg-[#0D110F] p-3.5 transition-colors hover:border-[#34473C] hover:bg-[#151E1A]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#222E27] bg-[#121916]">
                        <Icon
                          className={`h-4 w-4 ${getModalityColorClass(record.modality)}`}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#F5F7F5]">
                          {record.sourceLabel}
                        </p>
                        <p className="truncate font-mono text-xs text-[#9AA69E]">
                          {record.id} · {record.claimSummary}
                        </p>
                      </div>
                    </div>

                    <StatusIndicator
                      label={record.integrity}
                      tone={record.integrity === 'VERIFIED' ? 'verified' : 'demo'}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#222E27] pt-4 flex items-center justify-between text-xs">
            <span className="text-[#9AA69E]">
              PDF · Excel · Image/OCR
            </span>
            <button
              type="button"
              onClick={() => navigate('/evidence')}
              className="font-medium text-[#A6FF78] hover:underline"
            >
              View all records →
            </button>
          </div>
        </Card>

        {/* Claim Comparison */}
        <Card className="lg:col-span-7 p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#F5F7F5]">
                Claim Comparison
              </h2>
              <p className="mt-1 text-xs text-[#9AA69E]">
                Values extracted from the available evidence sources.
              </p>
            </div>

            <StatusIndicator
              label={`${observedDifferences.length} observed differences`}
              tone={observedDifferences.length > 0 ? 'conflict' : 'verified'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Age Chart */}
            <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-4">
              <p className="text-xs font-medium text-[#F5F7F5]">
                Extracted Age by Source
              </p>
              <p className="mt-0.5 text-[11px] text-[#9AA69E]">
                Age values in years
              </p>

              <div className="mt-3 h-44 w-full">
                {ageChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ageChartData}
                      margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke="#1E2923"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="source"
                        tick={{ fill: '#9AA69E', fontSize: 11 }}
                        axisLine={{ stroke: '#222E27' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 'auto']}
                        tick={{ fill: '#9AA69E', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(166, 255, 120, 0.06)' }}
                        contentStyle={{
                          backgroundColor: '#121916',
                          border: '1px solid #26342C',
                          borderRadius: '8px',
                          color: '#F5F7F5',
                          fontSize: '12px',
                        }}
                        formatter={(value) => [`${value} years`, 'Reported age']}
                        labelFormatter={(label, payload) =>
                          payload?.[0]?.payload?.sourceName || label
                        }
                      />
                      <Bar dataKey="reportedAge" name="Reported Age" radius={[6, 6, 0, 0]}>
                        {ageChartData.map((entry) => (
                          <Cell key={entry.source} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[#9AA69E]">
                    No numeric age claims available.
                  </div>
                )}
              </div>
            </div>

            {/* Difference Chart */}
            <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-4">
              <p className="text-xs font-medium text-[#F5F7F5]">
                Pairwise Age Differences
              </p>
              <p className="mt-0.5 text-[11px] text-[#9AA69E]">
                Calculated gaps in years
              </p>

              <div className="mt-3 h-44 w-full">
                {differenceChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={differenceChartData}
                      margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke="#1E2923"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="pair"
                        tick={{ fill: '#9AA69E', fontSize: 10 }}
                        axisLine={{ stroke: '#222E27' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 'auto']}
                        tick={{ fill: '#9AA69E', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#121916',
                          border: '1px solid #26342C',
                          borderRadius: '8px',
                          color: '#F5F7F5',
                          fontSize: '12px',
                        }}
                        formatter={(value) => [`${value} years`, 'Difference']}
                      />
                      <Bar
                        dataKey="varianceYears"
                        name="Difference"
                        fill="#F59E0B"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[#9AA69E]">
                    No differing age claims found.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Observed Differences */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#9AA69E]">
              Observed Claim Differences
            </p>

            <div className="divide-y divide-[#222E27] rounded-xl border border-[#222E27] bg-[#0D110F]">
              {observedDifferences.length === 0 && (
                <div className="px-4 py-4 text-xs text-[#9AA69E]">
                  No differences between matching age claims were found.
                </div>
              )}

              {observedDifferences.map((item, index) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />

                    <div>
                      <p className="font-medium text-[#F5F7F5]">
                        {item.subject} · {item.predicate}
                      </p>
                      <p className="mt-1 text-[#9AA69E]">
                        {item.firstValue} vs {item.secondValue} years
                        {' · '}
                        Difference: {item.difference} years
                      </p>
                      <p className="mt-1 text-[#7D8A82]">
                        {item.firstSource} / {item.secondSource}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-[#9AA69E]">
                    Pair {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Integrity and System Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Integrity */}
        <Card className="lg:col-span-7 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#34D399]" />
              <h2 className="text-base font-semibold text-[#F5F7F5]">
                Integrity Overview
              </h2>
            </div>

            <StatusIndicator
              label={
                integritySummary
                  ? `${integritySummary.verified_files ?? 0} verified`
                  : 'Unavailable'
              }
              tone={services.integrity ? 'verified' : 'disconnected'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-4">
              <p className="text-xs text-[#9AA69E]">Total Files</p>
              <p className="mt-1 text-2xl font-semibold text-[#F5F7F5] tabular-nums">
                {integritySummary?.total_files ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-4">
              <p className="text-xs text-[#9AA69E]">Verified Files</p>
              <p className="mt-1 text-2xl font-semibold text-[#34D399] tabular-nums">
                {integritySummary?.verified_files ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-4">
              <p className="text-xs text-[#9AA69E]">Unverified Files</p>
              <p className="mt-1 text-2xl font-semibold text-[#F5F7F5] tabular-nums">
                {integritySummary?.unverified_files ?? 0}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#222E27] bg-[#0D110F] p-4 space-y-2">
            <p className="text-xs font-medium text-[#F5F7F5]">
              Integrity Algorithm:{' '}
              <span className="font-mono text-[#A6FF78]">
                {integrityAlgorithm}
              </span>
            </p>
            <p className="text-xs leading-relaxed text-[#9AA69E]">
              A file is marked VERIFIED when its current SHA-256 fingerprint
              matches the fingerprint recorded during ingestion. This confirms
              file integrity, not the truth of its contents.
            </p>
          </div>
        </Card>

        {/* System Status */}
        <Card className="lg:col-span-5 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-[#F5F7F5]">
              System Status
            </h2>
            <p className="mt-1 text-xs text-[#9AA69E]">
              Live connectivity to local CERBERUS-X services.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#222E27] bg-[#0D110F] p-4">
              <div>
                <p className="text-sm font-medium text-[#F5F7F5]">
                  FastAPI Backend
                </p>
                <p className="text-xs text-[#9AA69E]">
                  Core API connectivity
                </p>
              </div>
              <StatusIndicator
                label={services.health ? 'Connected' : 'Disconnected'}
                tone={services.health ? 'running' : 'disconnected'}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#222E27] bg-[#0D110F] p-4">
              <div>
                <p className="text-sm font-medium text-[#F5F7F5]">
                  SHA-256 Integrity
                </p>
                <p className="text-xs text-[#9AA69E]">
                  File verification service
                </p>
              </div>
              <StatusIndicator
                label={services.integrity ? 'Available' : 'Unavailable'}
                tone={services.integrity ? 'verified' : 'disconnected'}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#222E27] bg-[#0D110F] p-4">
              <div>
                <p className="text-sm font-medium text-[#F5F7F5]">
                  Local AI Engine
                </p>
                <p className="text-xs text-[#9AA69E]">
                  {aiStatus?.model || 'Ollama model status'}
                </p>
              </div>
              <StatusIndicator
                label={services.ai ? 'Ready' : 'Unavailable'}
                tone={services.ai ? 'running' : 'disconnected'}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Evidence Detail Modal */}
      <EvidenceDetailModal
        record={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  );
}

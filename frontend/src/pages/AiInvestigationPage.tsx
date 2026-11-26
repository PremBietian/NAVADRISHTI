
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { Card } from '../components/Card';
import { cerberusApi } from '../services/api';

type EvidenceClaim = {
  claimId: string;
  subject: string;
  predicate: string;
  value: string;
  source: string;
  modality: string;
  location: string;
  verificationStatus: string;
};

type EvidenceRecord = {
  source_name?: string;
  modality?: string;
  metadata?: {
    original_filename?: string;
  };
  claims?: {
    claim_id?: string;
    subject?: string;
    predicate?: string;
    object?: string | number;
    source_location?: unknown;
    verification_status?: string;
  }[];
};

type ReviewStatus =
  | 'Pending Human Verification'
  | 'Primary Source Requested'
  | 'Escalated to Forensic Lead';

// Safely convert backend source-location metadata into readable text.
function formatSourceLocation(location: unknown): string {
  if (
    location === null ||
    location === undefined ||
    location === ''
  ) {
    return 'Not provided';
  }

  if (
    typeof location === 'string' ||
    typeof location === 'number'
  ) {
    return String(location);
  }

  if (typeof location === 'object' && !Array.isArray(location)) {
    return Object.entries(location as Record<string, unknown>)
      .filter(
        ([, value]) =>
          value !== null &&
          value !== undefined &&
          value !== ''
      )
      .map(([key, value]) => {
        const label = key.replace(/_/g, ' ');
        const formattedValue =
          typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);

        return `${label}: ${formattedValue}`;
      })
      .join(' · ') || 'Not provided';
  }

  return JSON.stringify(location) ?? 'Not provided';
}

export function AiInvestigationPage() {
  const [claims, setClaims] = useState<EvidenceClaim[]>([]);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewStatus, setReviewStatus] =
    useState<ReviewStatus>('Pending Human Verification');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let active = true;

    async function loadInvestigation() {
      setLoading(true);
      setError('');

      try {
        const [results, ai] = await Promise.all([
          cerberusApi.getResults(),
          cerberusApi.getAiStatus(),
        ]);

        if (!active) return;

        const records = (results.records || []) as EvidenceRecord[];

        const extractedClaims: EvidenceClaim[] = records.flatMap(
          (record) =>
            (record.claims || []).map((claim) => ({
              claimId: claim.claim_id || 'Unknown',
              subject: claim.subject || 'Unknown subject',
              predicate: claim.predicate || 'Unknown',
              value: String(claim.object ?? 'Unknown'),
              source:
                record.metadata?.original_filename ||
                record.source_name ||
                'Unknown source',
              modality: record.modality || 'Unknown',
              location: formatSourceLocation(claim.source_location),
              verificationStatus:
                claim.verification_status || 'UNVERIFIED',
            }))
        );

        setClaims(extractedClaims);
        setAiStatus(ai);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load investigation data.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInvestigation();

    return () => {
      active = false;
    };
  }, []);

  const observedDifferences = useMemo(() => {
    const groups = new Map<string, EvidenceClaim[]>();

    claims.forEach((claim) => {
      const key = `${claim.subject.toLowerCase()}::${claim.predicate.toLowerCase()}`;
      const existing = groups.get(key) || [];

      existing.push(claim);
      groups.set(key, existing);
    });

    return Array.from(groups.values()).filter(
      (group) =>
        new Set(group.map((claim) => claim.value)).size > 1
    );
  }, [claims]);

  const differenceCount = observedDifferences.reduce(
    (total, group) => {
      const uniqueValues = new Set(
        group.map((claim) => claim.value)
      );

      return total + (uniqueValues.size * (uniqueValues.size - 1)) / 2;
    },
    0
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 text-center text-[#9AA69E]">
        Loading live investigation data...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-7">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F5F7F5] sm:text-3xl">
          AI Investigation
        </h1>

        <p className="mt-2 text-sm text-[#9AA69E]">
          Investigate differences between extracted claims using evidence
          from the live CERBERUS-X backend.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-[#A6FF78]" />

          <h2 className="font-semibold text-[#F5F7F5]">
            Core Investigation Principle
          </h2>
        </div>

        <p className="text-sm leading-relaxed text-[#9AA69E]">
          The Python evidence engine determines and classifies conflicts.
          Local AI assists by explaining findings. AI does not decide which
          source is true. Final verification remains a human responsibility.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-[#9AA69E]">Extracted Claims</p>

          <p className="mt-2 text-3xl font-bold text-[#F5F7F5]">
            {claims.length}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs text-[#9AA69E]">Observed Differences</p>

          <p className="mt-2 text-3xl font-bold text-amber-400">
            {differenceCount}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs text-[#9AA69E]">AI Model</p>

          <p className="mt-2 text-lg font-bold text-[#F5F7F5]">
            {aiStatus?.model || 'Unavailable'}
          </p>

          <p className="mt-1 text-xs text-[#9AA69E]">
            {aiStatus?.ai_service || 'Local AI service'}
          </p>
        </Card>
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#A6FF78]" />

            <h2 className="font-semibold text-[#F5F7F5]">
              Local AI Service Status
            </h2>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              aiStatus?.available && aiStatus?.model_available
                ? 'bg-green-950/40 text-green-400'
                : 'bg-red-950/40 text-red-400'
            }`}
          >
            {aiStatus?.available && aiStatus?.model_available
              ? 'Connected'
              : 'Disconnected'}
          </span>
        </div>

        <div className="flex items-start gap-3 text-sm text-[#9AA69E]">
          {aiStatus?.available && aiStatus?.model_available ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          )}

          <p>
            {aiStatus?.message || 'AI service status is unavailable.'}
          </p>
        </div>
      </Card>

      <Card className="p-5 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F7F5]">
            Observed Differences from Evidence
          </h2>

          <p className="mt-1 text-xs text-[#9AA69E]">
            These differences are calculated from live extracted claims.
            They are not presented as backend-confirmed conflict classifications.
          </p>
        </div>

        {observedDifferences.length === 0 ? (
          <p className="text-sm text-[#9AA69E]">
            No differing claim values were found in the current evidence.
          </p>
        ) : (
          observedDifferences.map((group, index) => (
            <div
              key={`${group[0].subject}-${group[0].predicate}`}
              className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-4 space-y-4"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />

                <h3 className="font-semibold text-[#F5F7F5]">
                  Difference {index + 1}: {group[0].subject} — {group[0].predicate}
                </h3>
              </div>

              <div className="space-y-3">
                {group.map((claim) => (
                  <div
                    key={claim.claimId}
                    className="rounded-lg border border-[#26342C] bg-[#0D110F] p-3"
                  >
                    <p className="text-lg font-bold text-[#A6FF78]">
                      {claim.predicate}: {claim.value}
                    </p>

                    <p className="mt-1 text-xs text-[#9AA69E]">
                      Source: {claim.source}
                    </p>

                    <p className="mt-1 text-xs text-[#9AA69E]">
                      Modality: {claim.modality} · Location: {claim.location}
                    </p>

                    <p className="mt-1 text-xs text-amber-400">
                      Claim verification: {claim.verificationStatus}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-400" />

          <h2 className="font-semibold text-[#F5F7F5]">
            AI Explanation
          </h2>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-300">
            AI explanation is awaiting genuine conflict IDs
          </p>

          <p className="text-sm leading-relaxed text-[#D2D8D3]">
            Ollama and the configured model are available. However, the
            current backend results endpoint provides evidence and claims,
            not conflict IDs. The AI explanation endpoint requires a
            conflict ID. Therefore, this page does not send demonstration
            IDs or claim that an explanation was generated.
          </p>
        </div>

        <p className="text-xs text-[#9AA69E]">
          Backend endpoint: POST /ai/explain/{'{conflict_id}'}
        </p>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          {reviewStatus === 'Pending Human Verification' ? (
            <Clock className="h-5 w-5 text-amber-400" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-[#A6FF78]" />
          )}

          <h2 className="font-semibold text-[#F5F7F5]">
            Human Review Status
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              'Pending Human Verification',
              'Primary Source Requested',
              'Escalated to Forensic Lead',
            ] as ReviewStatus[]
          ).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setReviewStatus(status)}
              className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                reviewStatus === status
                  ? 'border-[#A6FF78] bg-[#18211C] text-[#A6FF78]'
                  : 'border-[#26342C] bg-[#0D110F] text-[#9AA69E]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div>
          <label
            htmlFor="analyst-notes"
            className="text-xs font-medium text-[#9AA69E]"
          >
            Investigator Notes (local session only)
          </label>

          <textarea
            id="analyst-notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Record the verification steps required..."
            className="mt-2 w-full rounded-xl border border-[#26342C] bg-[#0D110F] px-3 py-2 text-sm text-[#F5F7F5] placeholder-[#6E7B73] focus:border-[#A6FF78] focus:outline-none"
          />
        </div>
      </Card>
    </div>
  );
}

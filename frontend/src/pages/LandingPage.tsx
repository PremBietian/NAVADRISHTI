import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Network,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

const pipelineSteps = [
  {
    id: 'evidence',
    title: 'Evidence',
    summary: 'Multi-modal source intake for PDF filings, Excel spreadsheets, and scanned image files.',
    detail: 'Preserves original source provenance and prepares files for cryptographic verification.',
  },
  {
    id: 'extraction',
    title: 'Extraction',
    summary: 'Structured entity and quantitative claim extraction across text, cells, and OCR regions.',
    detail: 'Normalizes Subject–Predicate–Value triples such as Rahul Kumar — AGE — 25.',
  },
  {
    id: 'resolution',
    title: 'Entity Resolution',
    summary: 'Links disparate source-level mentions to a unified investigative subject.',
    detail: 'Consolidates 3 source-level entity records into the canonical Rahul Kumar entity.',
  },
  {
    id: 'graph',
    title: 'Knowledge Graph',
    summary: 'Maps directional evidence-to-entity-to-claim chains in an interactive spatial canvas.',
    detail: 'Reveals how independent sources converge on shared entities while diverging on claims.',
  },
  {
    id: 'contradiction',
    title: 'Contradiction Detection',
    summary: 'Deterministic pairwise comparison flags conflicting values without guessing ground truth.',
    detail: 'Surfaces all three VALUE_CONFLICT pairs across ages 25, 28, and 30.',
  },
  {
    id: 'investigation',
    title: 'Investigation',
    summary: 'Structured analyst review workspace paired with future local AI explanations.',
    detail: 'Supports human verification decisions with complete audit traceability.',
  },
];

const particles = [
  { id: 1, x: '12%', y: '18%', size: 3, delay: 0 },
  { id: 2, x: '28%', y: '74%', size: 2, delay: 0.8 },
  { id: 3, x: '48%', y: '22%', size: 2.5, delay: 1.5 },
  { id: 4, x: '68%', y: '82%', size: 3, delay: 0.4 },
  { id: 5, x: '84%', y: '28%', size: 2, delay: 1.2 },
  { id: 6, x: '91%', y: '64%', size: 2.5, delay: 2.0 },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [activePipelineIndex, setActivePipelineIndex] = useState(0);

  const scrollToCapabilities = () => {
    const el = document.getElementById('capabilities');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Ambient Radial Lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[540px] w-[900px] -translate-x-1/2 rounded-full bg-[#A6FF78]/[0.07] blur-[140px]"
      />

      {/* HERO SECTION */}
      <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center px-4 py-14 sm:px-6 lg:px-8">
        {/* Subtle Animated Particles */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {particles.map((p) => (
            <motion.span
              key={p.id}
              style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
              animate={{ opacity: [0.15, 0.55, 0.15], y: [0, -10, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                delay: p.delay,
                ease: 'easeInOut',
              }}
              className="absolute rounded-full bg-[#A6FF78]"
            />
          ))}
        </div>

        <div className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left Hero Copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-7"
          >
            <p className="text-xs font-medium tracking-wide text-[#A6FF78]">
              CERBERUS-X · Evidence Intelligence Platform
            </p>

            <h1
              className="text-balance font-bold tracking-tight text-[#F5F7F5]"
              style={{ fontSize: 'clamp(2.35rem, 4.3vw, 3.85rem)', lineHeight: 1.08 }}
            >
              Where Every Evidence Tells a Story.
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[#9AA69E] sm:text-lg">
              Connect fragmented evidence. Discover hidden relationships. Detect contradictions.
              Preserve digital integrity.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Button variant="primary" size="lg" onClick={() => navigate('/overview')}>
                <span>Enter Investigation</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant="outline" size="lg" onClick={scrollToCapabilities}>
                <span>Explore Platform</span>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-6 border-t border-[#1E2923] pt-6 max-w-lg">
              <div>
                <p className="text-xs text-[#9AA69E]">Modalities</p>
                <p className="mt-1 text-sm font-semibold text-[#F5F7F5]">PDF · Excel · OCR</p>
              </div>
              <div>
                <p className="text-xs text-[#9AA69E]">Detection</p>
                <p className="mt-1 text-sm font-semibold text-[#F5F7F5]">Pairwise Conflicts</p>
              </div>
              <div>
                <p className="text-xs text-[#9AA69E]">Integrity</p>
                <p className="mt-1 text-sm font-semibold text-[#F5F7F5]">SHA-256 Chain</p>
              </div>
            </div>
          </motion.div>

          {/* Right Hero Floating Multi-Modal Evidence Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 relative"
          >
            <div className="relative rounded-2xl border border-[#222E27] bg-[#0D110F]/90 p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_70%_50%,rgba(166,255,120,0.10),transparent_60%)]"
              />

              {/* Connecting SVG Curves */}
              <svg
                viewBox="0 0 500 320"
                className="pointer-events-none absolute inset-0 h-full w-full opacity-75"
                fill="none"
                aria-hidden="true"
              >
                <motion.path
                  d="M 210 68 C 280 68, 295 160, 345 160"
                  stroke="#60A5FA"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  animate={{ strokeDashoffset: [0, -20] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                />
                <motion.path
                  d="M 210 160 L 345 160"
                  stroke="#34D399"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  animate={{ strokeDashoffset: [0, -20] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                />
                <motion.path
                  d="M 210 252 C 280 252, 295 160, 345 160"
                  stroke="#A6FF78"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  animate={{ strokeDashoffset: [0, -20] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                />
              </svg>

              <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-12 items-center">
                {/* Floating Source Cards Column */}
                <div className="sm:col-span-7 space-y-3.5">
                  {/* PDF Floating Card */}
                  <motion.button
                    type="button"
                    onClick={() => navigate('/evidence')}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-full text-left rounded-xl border border-[#26342C] bg-[#121916] p-3.5 transition-colors hover:border-[#60A5FA]/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#60A5FA]/15 text-[#60A5FA]">
                          <FileText className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#F5F7F5]">PDF Evidence</p>
                          <p className="font-mono text-[11px] text-[#9AA69E]">EVD-8510526DFC1B</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#60A5FA] tabular-nums">
                        AGE 25
                      </span>
                    </div>
                  </motion.button>

                  {/* Excel Floating Card */}
                  <motion.button
                    type="button"
                    onClick={() => navigate('/evidence')}
                    animate={{ y: [0, 3, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                    className="w-full text-left rounded-xl border border-[#26342C] bg-[#121916] p-3.5 transition-colors hover:border-[#34D399]/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#34D399]/15 text-[#34D399]">
                          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#F5F7F5]">Excel Evidence</p>
                          <p className="font-mono text-[11px] text-[#9AA69E]">EVD-4D86453C03B7</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#34D399] tabular-nums">
                        AGE 28
                      </span>
                    </div>
                  </motion.button>

                  {/* Image/OCR Floating Card */}
                  <motion.button
                    type="button"
                    onClick={() => navigate('/evidence')}
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                    className="w-full text-left rounded-xl border border-[#26342C] bg-[#121916] p-3.5 transition-colors hover:border-[#A6FF78]/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#A6FF78]/15 text-[#A6FF78]">
                          <ImageIcon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#F5F7F5]">Image / OCR</p>
                          <p className="font-mono text-[11px] text-[#9AA69E]">EVD-A383CB349785</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#A6FF78] tabular-nums">
                        AGE 30
                      </span>
                    </div>
                  </motion.button>
                </div>

                {/* Converged Entity & Contradiction Node */}
                <div className="sm:col-span-5">
                  <button
                    type="button"
                    onClick={() => navigate('/graph')}
                    className="w-full text-left rounded-xl border border-[#A6FF78]/50 bg-[#18211C] p-5 shadow-[0_0_32px_rgba(166,255,120,0.12)] transition-colors hover:border-[#A6FF78]"
                  >
                    <p className="text-xs font-medium text-[#A6FF78]">Resolved Entity</p>
                    <p className="mt-1 text-lg font-bold text-[#F5F7F5]">Rahul Kumar</p>
                    <div className="mt-4 space-y-2 border-t border-[#26342C] pt-3 text-xs">
                      <div className="flex items-center justify-between text-[#9AA69E]">
                        <span>Source Records</span>
                        <span className="font-mono font-semibold text-[#F5F7F5] tabular-nums">
                          3
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-amber-400">
                        <span>Conflicts</span>
                        <span className="font-mono font-semibold tabular-nums">
                          3 VALUE_CONFLICT
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#A6FF78]">
                      <span>Open Knowledge Graph</span>
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CAPABILITY SECTIONS */}
      <section
        id="capabilities"
        className="mx-auto max-w-7xl border-t border-[#1A241E] px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-medium text-[#A6FF78]">Platform Capabilities</p>
          <h2 className="text-2xl font-bold tracking-tight text-[#F5F7F5] sm:text-3xl text-balance">
            Three pillars built for high-stakes forensic investigation
          </h2>
          <p className="text-sm leading-relaxed text-[#9AA69E] sm:text-base">
            CERBERUS-X separates deterministic evidence analysis from explanation—ensuring every
            claim traces cleanly back to its source artifact.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* 01. Evidence Intelligence (Asymmetric Featured Card) */}
          <Card className="lg:col-span-6 p-7 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium text-[#A6FF78]">
                  01. Evidence Intelligence
                </span>
                <Network className="h-5 w-5 text-[#60A5FA]" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-[#F5F7F5]">
                Unified Entity & Claim Extraction Across Modalities
              </h3>
              <p className="text-sm leading-relaxed text-[#9AA69E]">
                Ingest heterogeneous PDFs, Excel workbooks, and OCR-scanned images into a single
                structured graph. Resolve matching entities across disparate naming and formatting
                conventions while preserving exact page, cell, and bounding-region provenance.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-[#222E27] pt-4 text-xs">
              <span className="text-[#9AA69E]">PDF · XLSX · PNG / JPG</span>
              <button
                type="button"
                onClick={() => navigate('/evidence')}
                className="inline-flex items-center gap-1 font-medium text-[#A6FF78] hover:underline"
              >
                <span>Inspect Evidence Explorer</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </Card>

          {/* 02. Contradiction Detection */}
          <Card className="lg:col-span-6 p-7 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium text-[#A6FF78]">
                  02. Contradiction Detection
                </span>
                <Scale className="h-5 w-5 text-amber-400" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-[#F5F7F5]">
                Deterministic Conflict Discovery Without Speculation
              </h3>
              <p className="text-sm leading-relaxed text-[#9AA69E]">
                Pairwise rule engines evaluate every extracted claim for the same subject and
                predicate. When sources disagree—such as reported ages 25, 28, and 30—CERBERUS-X
                flags every VALUE_CONFLICT explicitly and defers truth determination to human
                investigators.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-[#222E27] pt-4 text-xs">
              <span className="text-[#9AA69E]">Pairwise VALUE_CONFLICT Engine</span>
              <button
                type="button"
                onClick={() => navigate('/investigation')}
                className="inline-flex items-center gap-1 font-medium text-[#A6FF78] hover:underline"
              >
                <span>Open AI Investigation</span>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </Card>

          {/* 03. Digital Evidence Integrity (Full-Width Highlight) */}
          <Card elevated className="lg:col-span-12 p-7">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-medium text-[#34D399]">
                    03. Digital Evidence Integrity
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-[#F5F7F5]">
                  SHA-256 Chain-of-Custody Verification
                </h3>
                <p className="text-sm leading-relaxed text-[#9AA69E]">
                  Every ingested artifact is paired with expected and calculated SHA-256 checksum
                  verification inside the FastAPI integrity pipeline—protecting evidentiary
                  admissibility and preventing unverified tampering from entering the knowledge graph.
                </p>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-3 rounded-xl border border-[#26342C] bg-[#0D110F] p-5">
                <div className="flex items-center gap-2 text-xs font-medium text-[#34D399]">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  <span>Demonstration Fixture Integrity</span>
                </div>
                <p className="text-2xl font-semibold text-[#F5F7F5] tabular-nums">
                  3 Verified · 0 Excluded
                </p>
                <p className="text-xs text-[#9AA69E]">
                  Live SHA-256 digest matching activates upon backend connection.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* WORKFLOW PIPELINE SECTION */}
      <section className="mx-auto max-w-7xl border-t border-[#1A241E] px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-medium text-[#A6FF78]">Investigation Pipeline</p>
            <h2 className="text-2xl font-bold tracking-tight text-[#F5F7F5] sm:text-3xl">
              From raw artifact to verified human judgment
            </h2>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/graph')}>
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Explore Interactive Graph</span>
          </Button>
        </div>

        {/* Interactive 6-Stage Flow */}
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {pipelineSteps.map((step, index) => {
            const isSelected = index === activePipelineIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActivePipelineIndex(index)}
                className={`text-left rounded-xl border p-4 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6FF78] ${
                  isSelected
                    ? 'border-[#A6FF78] bg-[#18211C]'
                    : 'border-[#222E27] bg-[#121916] hover:border-[#34473C]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#9AA69E] tabular-nums">
                    0{index + 1}
                  </span>
                  {index < pipelineSteps.length - 1 && (
                    <ArrowRight className="hidden lg:block h-3.5 w-3.5 text-[#495E51]" />
                  )}
                </div>
                <p
                  className={`mt-3 text-sm font-semibold ${
                    isSelected ? 'text-[#A6FF78]' : 'text-[#F5F7F5]'
                  }`}
                >
                  {step.title}
                </p>
              </button>
            );
          })}
        </div>

        <Card className="mt-4 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-[#A6FF78]">
                Stage 0{activePipelineIndex + 1} · {pipelineSteps[activePipelineIndex].title}
              </p>
              <p className="mt-1 text-base font-semibold text-[#F5F7F5]">
                {pipelineSteps[activePipelineIndex].summary}
              </p>
              <p className="mt-1 text-sm text-[#9AA69E]">
                {pipelineSteps[activePipelineIndex].detail}
              </p>
            </div>
            <Sparkles className="hidden sm:block h-5 w-5 shrink-0 text-[#A6FF78]/70" />
          </div>
        </Card>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="mx-auto max-w-7xl border-t border-[#1A241E] px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#26342C] bg-[#0D110F] px-6 py-12 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight text-[#F5F7F5] sm:text-3xl text-balance">
            Inspect the demonstration investigation workspace
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#9AA69E] sm:text-base">
            Review extracted claims, explore the interactive knowledge graph, and examine how
            CERBERUS-X isolates conflicting evidence for human verification.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button variant="primary" size="lg" onClick={() => navigate('/overview')}>
              <span>Enter Investigation</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('/graph')}>
              <span>Open Knowledge Graph</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

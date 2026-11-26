import { AlertTriangle, CheckCircle2, Clock, WifiOff } from 'lucide-react';

type IndicatorTone = 'verified' | 'conflict' | 'running' | 'disconnected' | 'demo';

interface StatusIndicatorProps {
  label: string;
  tone: IndicatorTone;
  sublabel?: string;
}

export function StatusIndicator({ label, tone, sublabel }: StatusIndicatorProps) {
  const config: Record<
    IndicatorTone,
    { icon: typeof CheckCircle2; colorClass: string }
  > = {
    verified: {
      icon: CheckCircle2,
      colorClass: 'text-[#34D399]',
    },
    conflict: {
      icon: AlertTriangle,
      colorClass: 'text-amber-400',
    },
    running: {
      icon: CheckCircle2,
      colorClass: 'text-[#A6FF78]',
    },
    disconnected: {
      icon: WifiOff,
      colorClass: 'text-[#9AA69E]',
    },
    demo: {
      icon: Clock,
      colorClass: 'text-[#60A5FA]',
    },
  };

  const { icon: Icon, colorClass } = config[tone];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} aria-hidden="true" />
      <span className={colorClass}>{label}</span>
      {sublabel && <span className="text-[#9AA69E] font-normal">· {sublabel}</span>}
    </span>
  );
}

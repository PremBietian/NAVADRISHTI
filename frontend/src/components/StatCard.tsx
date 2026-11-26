import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: number | string;
  detail: string;
  tone?: 'neutral' | 'emerald' | 'accent' | 'blue' | 'amber';
}

const toneAccentMap: Record<NonNullable<StatCardProps['tone']>, string> = {
  neutral: 'text-[#F5F7F5]',
  emerald: 'text-[#34D399]',
  accent: 'text-[#A6FF78]',
  blue: 'text-[#60A5FA]',
  amber: 'text-amber-400',
};

export function StatCard({ label, value, detail, tone = 'neutral' }: StatCardProps) {
  return (
    <Card className="p-5 flex flex-col justify-between gap-3">
      <p className="text-xs font-medium text-[#9AA69E]">{label}</p>
      <p className={`text-3xl font-semibold tracking-tight tabular-nums ${toneAccentMap[tone]}`}>
        {value}
      </p>
      <p className="text-xs text-[#7D8A82]">{detail}</p>
    </Card>
  );
}

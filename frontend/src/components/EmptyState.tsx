import { SearchX } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#26342C] bg-[#0D110F]/70 px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#222E27] bg-[#121916] text-[#9AA69E]">
        <SearchX className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[#F5F7F5]">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-[#9AA69E]">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

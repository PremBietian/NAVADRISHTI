import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = '',
  elevated = false,
  hoverable = false,
  onClick,
}: CardProps) {
  const baseBg = elevated ? 'bg-[#18211C]' : 'bg-[#121916]';
  const hoverStyles = hoverable
    ? 'transition-colors duration-150 hover:border-[#35483D] hover:bg-[#151E1A]'
    : '';

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className={`rounded-xl border border-[#222E27] ${baseBg} ${hoverStyles} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6FF78] ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-[#222E27] ${baseBg} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
}

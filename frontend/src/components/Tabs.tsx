import React from 'react';
import { motion } from 'framer-motion';

export interface TabOption {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabOption[];
  activeTab: string;
  onChange: (id: string) => void;
  layoutId?: string;
}

export function Tabs({ tabs, activeTab, onChange, layoutId = 'active-tab' }: TabsProps) {
  return (
    <div
      role="tablist"
      className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#222E27] bg-[#0D110F] p-1"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6FF78] ${
              isActive ? 'text-[#070908]' : 'text-[#9AA69E] hover:text-[#F5F7F5]'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 rounded-lg bg-[#A6FF78]"
              />
            )}
            <span className="relative z-10">{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`relative z-10 font-mono text-xs tabular-nums ${
                  isActive ? 'text-[#070908]/80 font-semibold' : 'text-[#6E7B73]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

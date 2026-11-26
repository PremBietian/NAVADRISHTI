import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Logo } from '../components/Logo';

interface AppLayoutProps {
  children: React.ReactNode;
  onOpenUpload: () => void;
}

export function AppLayout({ children, onOpenUpload }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#070908] text-[#F5F7F5]">
      <Navbar onOpenUpload={onOpenUpload} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[#1A241E] bg-[#070908]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo className="h-6 w-6" />
            <span className="text-sm font-semibold text-[#F5F7F5]">CERBERUS-X</span>
            <span className="text-xs text-[#7D8A82]">
              Evidence Intelligence & Integrity Platform
            </span>
          </div>
          <nav aria-label="Footer Navigation" className="flex flex-wrap items-center gap-6 text-xs text-[#9AA69E]">
            <Link to="/overview" className="hover:text-[#F5F7F5] transition-colors">
              Overview
            </Link>
            <Link to="/evidence" className="hover:text-[#F5F7F5] transition-colors">
              Evidence & Conflicts
            </Link>
            <Link to="/graph" className="hover:text-[#F5F7F5] transition-colors">
              Knowledge Graph
            </Link>
            <Link to="/investigation" className="hover:text-[#F5F7F5] transition-colors">
              AI Investigation
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

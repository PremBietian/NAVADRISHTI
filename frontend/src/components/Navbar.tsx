import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Upload, X } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from './Button';

interface NavbarProps {
  onOpenUpload: () => void;
}

const navItems = [
  { to: '/overview', label: 'Overview' },
  { to: '/evidence', label: 'Evidence & Conflicts' },
  { to: '/graph', label: 'Knowledge Graph' },
  { to: '/investigation', label: 'AI Investigation' },
];

export function Navbar({ onOpenUpload }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#222E27] bg-[#070908]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Custom SVG Logo + Product Name */}
        <Link
          to="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6FF78] rounded-lg py-1"
        >
          <Logo className="h-8 w-8" />
          <span className="text-base font-bold tracking-tight text-[#F5F7F5]">
            CERBERUS-X
          </span>
        </Link>

        {/* Middle: Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative py-5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-none focus-visible:text-[#A6FF78] ${
                  isActive
                    ? 'text-[#F5F7F5]'
                    : 'text-[#9AA69E] hover:text-[#F5F7F5]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-underline"
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-[#A6FF78]"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right: Frontend Demo Status + Upload Evidence Action */}
        <div className="flex items-center gap-4 shrink-0">
          <span className="hidden lg:inline-block text-xs font-medium text-[#9AA69E] whitespace-nowrap">
            Frontend Demo Mode
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenUpload}
            className="hidden sm:inline-flex"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Upload Evidence</span>
          </Button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex md:hidden items-center justify-center rounded-lg border border-[#222E27] bg-[#121916] p-2 text-[#F5F7F5] transition-colors hover:bg-[#18211C]"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="md:hidden border-t border-[#222E27] bg-[#0D110F] overflow-hidden"
          >
            <nav className="flex flex-col px-4 py-4 gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#18211C] text-[#A6FF78]'
                        : 'text-[#9AA69E] hover:bg-[#121916] hover:text-[#F5F7F5]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="mt-3 pt-3 border-t border-[#222E27] flex items-center justify-between gap-3">
                <span className="text-xs text-[#9AA69E]">Frontend Demo Mode</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenUpload();
                  }}
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Upload Evidence</span>
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

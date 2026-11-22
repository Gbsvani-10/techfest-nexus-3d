import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { SectionId } from '../../types/festival';

interface NavbarProps {
  activeSection: SectionId;
  onNavigate: (id: SectionId) => void;
}

const NAV_LINKS: { id: SectionId; label: string }[] = [
  { id: 'world', label: 'World' },
  { id: 'events', label: 'Events' },
  { id: 'lab', label: 'Lab' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'contact', label: 'Contact' },
];

export function Navbar({ activeSection, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id: SectionId) => {
    setMobileOpen(false);
    onNavigate(id);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-cyan-500/15 bg-[#040714]/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-5 py-3.5 md:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            handleNav('hero');
          }}
          className="font-display text-base font-bold tracking-[0.14em] text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          TECHFEST NEXUS
        </a>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.id);
                }}
                className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  isActive
                    ? 'text-cyan-300 border-cyan-400'
                    : 'text-slate-300 border-transparent hover:text-white hover:border-slate-500'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('contact')}
            className="hidden sm:inline-flex items-center justify-center rounded-md bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-300 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
          >
            Register
          </button>
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-700 text-slate-200 hover:border-cyan-400 md:hidden cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-800 bg-[#040714] px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`flex min-h-[44px] items-center rounded-md px-3 text-left text-sm font-medium transition-colors cursor-pointer ${
                  activeSection === item.id
                    ? 'bg-cyan-500/15 text-cyan-300'
                    : 'text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleNav('contact')}
              className="mt-2 flex min-h-[44px] items-center justify-center rounded-md bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 cursor-pointer"
            >
              Register
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

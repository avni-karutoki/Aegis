import React, { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

interface NavbarProps {
  activeView: 'landing' | 'dashboard';
  onOpenDashboard: () => void;
  onBackToLanding: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onOpenDashboard,
  onBackToLanding,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setMobileOpen(false);
    if (activeView !== 'landing') {
      onBackToLanding();
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#050A07]/95 border-b border-white/[0.08]">
      <div className="max-w-[1440px] mx-auto px-5 md:px-10 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onBackToLanding();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-lg font-extrabold tracking-[0.12em] uppercase text-[#F4F7F4] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8FF2E] rounded-sm"
        >
          AEGIS
        </a>

        {/* Zone 2: 4 Concise Single-Line Nav Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-8 text-xs font-medium tracking-[0.14em] uppercase text-[#9FB2A5]"
        >
          <button
            type="button"
            onClick={() => handleNavClick('platform')}
            className="hover:text-[#F4F7F4] transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B8FF2E] cursor-pointer"
          >
            Platform
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('network')}
            className="hover:text-[#F4F7F4] transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B8FF2E] cursor-pointer"
          >
            Network
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('intelligence')}
            className="hover:text-[#F4F7F4] transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B8FF2E] cursor-pointer"
          >
            Intelligence
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('about')}
            className="hover:text-[#F4F7F4] transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#B8FF2E] cursor-pointer"
          >
            About
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenDashboard();
            }}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.1em] uppercase bg-[#B8FF2E] text-[#050A07] rounded-md hover:bg-[#ccff5c] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8FF2E]"
          >
            <span>Explore Dashboard</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 text-[#F4F7F4] border border-white/15 rounded-md"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#07110B] px-5 py-4 flex flex-col gap-3">
          {(['platform', 'network', 'intelligence', 'about'] as const).map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => handleNavClick(sec)}
              className="text-left text-sm font-medium uppercase tracking-[0.12em] text-[#9FB2A5] hover:text-[#F4F7F4] py-2 border-b border-white/5"
            >
              {sec}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenDashboard();
            }}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-[0.1em] uppercase bg-[#B8FF2E] text-[#050A07] rounded-md"
          >
            <span>Explore Dashboard</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </header>
  );
};

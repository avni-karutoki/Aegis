import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

interface FooterSectionProps {
  onOpenDashboard: () => void;
}

export const FooterSection: React.FC<FooterSectionProps> = ({
  onOpenDashboard,
}) => {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-white/10 bg-[#040806] pt-24 pb-12 px-5 md:px-10">
      <div className="max-w-[1440px] mx-auto space-y-16">
        {/* Cinematic Oversized Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-10"
        >
          <h2 className="font-display font-black text-[clamp(2.5rem,6vw,5.4rem)] leading-[0.9] tracking-[-0.04em] text-[#F4F7F4] max-w-4xl text-balance">
            THE FUTURE OF SECURITY IS{' '}
            <span className="text-[#B8FF2E]">COLLABORATIVE.</span>
          </h2>

          <button
            type="button"
            onClick={onOpenDashboard}
            className="self-start lg:self-end inline-flex items-center gap-2.5 px-6 py-3.5 text-xs font-bold tracking-[0.14em] uppercase bg-[#B8FF2E] text-[#050A07] rounded-md hover:bg-[#d2ff6e] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Explore Dashboard</span>
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </motion.div>

        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pt-12 border-t border-white/10">
          <div className="md:col-span-5 space-y-3">
            <div className="font-display text-lg font-extrabold tracking-[0.12em] uppercase text-[#F4F7F4]">
              AEGIS
            </div>
            <p className="text-sm text-[#9FB2A5] leading-relaxed max-w-md">
              A collaborative cybersecurity concept where independent AI agents
              exchange intelligence, cross-verify evidence, and establish
              network trust together.
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <div className="font-mono-tabular text-xs tracking-[0.16em] uppercase text-[#6E8275]">
              Navigation
            </div>
            <ul className="space-y-2 text-sm text-[#9FB2A5]">
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('platform')}
                  className="hover:text-[#F4F7F4] cursor-pointer"
                >
                  Platform
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('network')}
                  className="hover:text-[#F4F7F4] cursor-pointer"
                >
                  Network
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('intelligence')}
                  className="hover:text-[#F4F7F4] cursor-pointer"
                >
                  Intelligence
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('about')}
                  className="hover:text-[#F4F7F4] cursor-pointer"
                >
                  About
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <div className="font-mono-tabular text-xs tracking-[0.16em] uppercase text-[#6E8275]">
              Project Links (Placeholders)
            </div>
            <ul className="space-y-2 text-sm text-[#9FB2A5]">
              <li>
                <a
                  href="#github-placeholder"
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-1.5 hover:text-[#B8FF2E]"
                >
                  <span>GitHub Repository</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="#x-placeholder"
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-1.5 hover:text-[#B8FF2E]"
                >
                  <span>X / Updates</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="#linkedin-placeholder"
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-1.5 hover:text-[#B8FF2E]"
                >
                  <span>LinkedIn</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#6E8275]">
          <span>Aegis · Collaborative Agent Verification Showcase</span>
          <span>Interactive frontend prototype with simulated telemetry</span>
        </div>
      </div>
    </footer>
  );
};

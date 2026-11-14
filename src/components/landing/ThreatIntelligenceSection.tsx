import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useSimulation } from '../../context/SimulationContext';
import { VerificationStatus } from '../../types/sentinel';

type FilterOption = 'All' | VerificationStatus;

export const ThreatIntelligenceSection: React.FC = () => {
  const { events } = useSimulation();
  const [filter, setFilter] = useState<FilterOption>('All');
  const [expandedId, setExpandedId] = useState<string | null>(events[0]?.id ?? null);

  const filteredEvents = useMemo(() => {
    if (filter === 'All') return events;
    return events.filter((e) => e.verificationStatus === filter);
  }, [events, filter]);

  const severityColor = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return 'text-[#F87171]';
      case 'High':
        return 'text-[#F59E0B]';
      case 'Medium':
        return 'text-[#B8FF2E]';
      default:
        return 'text-[#9FB2A5]';
    }
  };

  const statusColor = (status: VerificationStatus) => {
    switch (status) {
      case 'Verified':
        return 'text-[#34D399]';
      case 'Flagged Unreliable':
        return 'text-[#F87171]';
      default:
        return 'text-[#F59E0B]';
    }
  };

  return (
    <section
      id="intelligence"
      className="py-24 lg:py-32 px-5 md:px-10 max-w-[1440px] mx-auto border-t border-white/[0.08]"
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12"
      >
        <div className="space-y-3 max-w-2xl">
          <div className="font-mono-tabular text-xs tracking-[0.2em] text-[#B8FF2E] font-semibold">
            05 · COLLABORATIVE INTELLIGENCE FEED
          </div>
          <h2 className="font-display font-black text-[clamp(2.1rem,4vw,3.6rem)] leading-[1.0] tracking-[-0.03em] text-[#F4F7F4]">
            VERIFIED SIGNALS, ZERO NOISE.
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0A160F] border border-white/10 rounded-lg">
          {(['All', 'Verified', 'Verifying', 'Flagged Unreliable'] as FilterOption[]).map(
            (opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFilter(opt)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === opt
                    ? 'bg-[#B8FF2E] text-[#050A07] font-semibold'
                    : 'text-[#9FB2A5] hover:text-[#F4F7F4]'
                }`}
              >
                {opt}
              </button>
            )
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        className="border-t border-b border-white/15 divide-y divide-white/10"
      >
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#9FB2A5]">
            No intelligence events match the selected verification filter.
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const isExpanded = expandedId === ev.id;
            return (
              <div
                key={ev.id}
                className="transition-colors hover:bg-[#08120C]"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                  className="w-full text-left py-6 px-2 sm:px-4 grid grid-cols-1 lg:grid-cols-12 items-center gap-4 cursor-pointer"
                >
                  <div className="lg:col-span-5 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-xs text-[#6E8275]">
                      <span className="text-[#9FB2A5]">{ev.id}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ev.sourceName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ev.timestamp}</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#F4F7F4]">
                      {ev.title}
                    </h3>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[#6E8275]">
                      Severity
                    </div>
                    <div
                      className={`font-mono-tabular text-sm font-semibold mt-0.5 ${severityColor(
                        ev.severity
                      )}`}
                    >
                      {ev.severity}
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[#6E8275]">
                      Confidence
                    </div>
                    <div className="font-mono-tabular text-sm font-semibold text-[#F4F7F4] mt-0.5">
                      {ev.confidence.toFixed(1)}%
                    </div>
                  </div>

                  <div className="lg:col-span-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-[#6E8275]">
                        Verification
                      </div>
                      <div
                        className={`font-mono-tabular text-sm font-semibold mt-0.5 ${statusColor(
                          ev.verificationStatus
                        )}`}
                      >
                        {ev.verificationStatus}
                      </div>
                    </div>
                    <span className="text-[#9FB2A5]">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="px-2 sm:px-4 pb-6 pt-1 grid grid-cols-1 lg:grid-cols-12 gap-6 border-t border-white/5 bg-[#07110B]"
                    >
                      <div className="lg:col-span-6 space-y-1.5 pt-3">
                        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#6E8275]">
                          Evidence Summary
                        </div>
                        <p className="text-sm text-[#D4DFD7] leading-relaxed">
                          {ev.summary}
                        </p>
                      </div>
                      <div className="lg:col-span-4 space-y-1.5 pt-3">
                        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#6E8275]">
                          Network Recommendation
                        </div>
                        <p className="text-sm text-[#B8FF2E] font-medium leading-relaxed">
                          {ev.recommendation}
                        </p>
                      </div>
                      <div className="lg:col-span-2 space-y-1.5 pt-3">
                        <div className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#6E8275]">
                          Corroborators
                        </div>
                        <div className="font-mono-tabular text-sm text-[#F4F7F4]">
                          {ev.corroboratedBy.length > 0
                            ? ev.corroboratedBy.map((id) => `Agent ${id}`).join(' · ')
                            : 'None (0 peers)'}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </motion.div>
    </section>
  );
};

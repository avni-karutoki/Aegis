import React from 'react';
import { motion } from 'motion/react';
import { useSimulation } from '../../context/SimulationContext';
import { TRUST_PILLARS } from '../../data/mockData';

interface CircularGaugeProps {
  value: number;
  label: string;
  sublabel: string;
  accent?: string;
}

const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  label,
  sublabel,
  accent = '#B8FF2E',
}) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex items-center gap-6 py-4">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono-tabular text-2xl font-bold text-[#F4F7F4]">
            {value.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="font-display text-xl font-bold text-[#F4F7F4]">
          {label}
        </div>
        <p className="text-sm text-[#9FB2A5] leading-relaxed max-w-xs">
          {sublabel}
        </p>
      </div>
    </div>
  );
};

export const TrustIntelligenceSection: React.FC = () => {
  const { agents, events, selectedAgentId, setSelectedAgentId } = useSimulation();
  const activeAgent = agents.find((a) => a.id === selectedAgentId) ?? agents[0];
  const latestEvent = events[0];

  const dynamicFactors = [
    {
      label: 'Agent reliability',
      score: activeAgent.trustScore,
      detail: TRUST_PILLARS[0].detail,
    },
    {
      label: 'Historical accuracy',
      score: activeAgent.historicalAccuracy,
      detail: TRUST_PILLARS[1].detail,
    },
    {
      label: 'Evidence completeness',
      score: activeAgent.evidenceCompleteness,
      detail: TRUST_PILLARS[2].detail,
    },
    {
      label: 'Independent corroboration',
      score: activeAgent.corroborationRate,
      detail: TRUST_PILLARS[3].detail,
    },
    {
      label: 'Historical consistency',
      score: activeAgent.consistencyScore,
      detail: TRUST_PILLARS[4].detail,
    },
  ];

  return (
    <section className="py-24 lg:py-32 px-5 md:px-10 max-w-[1440px] mx-auto border-t border-white/[0.08]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left: Editorial Statement + Agent Trust vs Threat Confidence */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 space-y-10"
        >
          <div className="space-y-4">
            <div className="font-mono-tabular text-xs tracking-[0.2em] text-[#B8FF2E]">
              04 · DUAL-DIMENSION SCORING
            </div>
            <h2 className="font-display font-black text-[clamp(2.25rem,4.5vw,4.1rem)] leading-[0.96] tracking-[-0.03em] text-[#F4F7F4] text-balance">
              TRUST IS EARNED THROUGH EVIDENCE.
            </h2>
            <p className="text-base text-[#9FB2A5] leading-relaxed max-w-lg">
              Aegis separates who reports an anomaly from how strongly
              the evidence holds up under peer scrutiny—preventing noisy agents
              from triggering false escalations.
            </p>
          </div>

          {/* Interactive Agent Focus Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {agents.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAgentId(a.id)}
                className={`px-3.5 py-2 text-xs font-mono-tabular rounded-md border transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                  a.id === activeAgent.id
                    ? 'border-[#B8FF2E] bg-[#B8FF2E] text-[#050A07] font-semibold'
                    : 'border-white/15 text-[#9FB2A5] hover:text-[#F4F7F4] hover:border-white/30'
                }`}
              >
                Agent {a.id}
              </button>
            ))}
          </div>

          {/* Two Circular Gauges Comparing Agent Trust vs Threat Confidence */}
          <div className="border-t border-b border-white/10 divide-y divide-white/10">
            <CircularGauge
              value={activeAgent.trustScore}
              label="Agent Trust"
              sublabel={`Historical reliability for ${activeAgent.name} across ${activeAgent.reportsSubmitted} submitted intelligence cycles.`}
              accent="#B8FF2E"
            />
            <CircularGauge
              value={latestEvent.confidence}
              label="Threat Confidence"
              sublabel={`Strength of corroborated evidence for latest event (${latestEvent.id} · ${latestEvent.verificationStatus}).`}
              accent={
                latestEvent.verificationStatus === 'Flagged Unreliable'
                  ? '#EF4444'
                  : '#10B981'
              }
            />
          </div>
        </motion.div>

        {/* Right: Five Evidence Dimensions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 pt-2"
        >
          <div className="text-xs font-mono-tabular tracking-[0.16em] uppercase text-[#6E8275] pb-4 border-b border-white/10">
            {activeAgent.name} · Evidence Breakdown
          </div>

          <div className="divide-y divide-white/10">
            {dynamicFactors.map((factor, idx) => (
              <div key={factor.label} className="py-6 space-y-3">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono-tabular text-xs text-[#6E8275]">
                      0{idx + 1}
                    </span>
                    <h3 className="font-display text-lg font-bold text-[#F4F7F4]">
                      {factor.label}
                    </h3>
                  </div>
                  <span className="font-mono-tabular text-lg font-bold text-[#B8FF2E]">
                    {factor.score.toFixed(1)}%
                  </span>
                </div>

                {/* Minimal Hairline Progress Bar */}
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#10B981] to-[#B8FF2E] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, factor.score)}%` }}
                  />
                </div>

                <p className="text-xs text-[#9FB2A5] leading-relaxed">
                  {factor.detail}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

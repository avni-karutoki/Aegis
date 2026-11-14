import React, { useState } from 'react';
import { motion } from 'motion/react';

const STEPS = [
  {
    num: '01',
    title: 'DETECT',
    summary: 'An independent agent identifies suspicious activity.',
    detail:
      'Local telemetry monitors process execution, authentication velocity, and socket state without waiting on a central bottleneck.',
  },
  {
    num: '02',
    title: 'SHARE',
    summary: 'Relevant intelligence is shared with other agents.',
    detail:
      'Signed evidence digests—never raw secrets—are broadcast across the Maritime mesh to neighboring infrastructure agents.',
  },
  {
    num: '03',
    title: 'VERIFY',
    summary: 'Other agents independently assess the evidence.',
    detail:
      'Peer agents inspect their own logs, API traces, and query histories to corroborate or refute the submitted anomaly.',
  },
  {
    num: '04',
    title: 'RESPOND',
    summary: 'The network generates a confidence-based recommendation.',
    detail:
      'Weighted by historical agent trust and independent corroboration, Aegis issues an actionable containment posture.',
  },
];

export const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="py-24 lg:py-32 px-5 md:px-10 max-w-[1440px] mx-auto border-t border-white/[0.08]">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16"
      >
        <div className="space-y-3">
          <div className="font-mono-tabular text-xs tracking-[0.2em] text-[#B8FF2E]">
            02 · COLLABORATIVE PROTOCOL
          </div>
          <h2 className="font-display font-black text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.03em] text-[#F4F7F4]">
            DETECT. SHARE. VERIFY. RESPOND.
          </h2>
        </div>

        <p className="text-sm text-[#9FB2A5] max-w-sm leading-relaxed">
          Select any protocol phase below to inspect how isolated telemetry
          becomes mesh-verified certainty.
        </p>
      </motion.div>

      {/* Horizontal Editorial Composition (Hairline Columns, Oversized Numerals, No Card Boxes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-b border-white/15 divide-y md:divide-y-0 md:divide-x divide-white/10">
        {STEPS.map((item, idx) => {
          const isActive = activeStep === idx;
          return (
            <motion.button
              key={item.num}
              type="button"
              onClick={() => setActiveStep(idx)}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className={`group text-left py-10 px-6 lg:px-8 transition-colors duration-200 cursor-pointer flex flex-col justify-between min-h-[290px] ${
                isActive ? 'bg-[#0A1A11]' : 'bg-transparent hover:bg-[#08130C]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className={`font-display font-black text-6xl lg:text-7xl leading-none tracking-[-0.04em] tabular-nums transition-colors duration-200 ${
                    isActive
                      ? 'text-[#B8FF2E]'
                      : 'text-white/20 group-hover:text-white/45'
                  }`}
                >
                  {item.num}
                </span>

                <span
                  className={`font-mono-tabular text-[11px] tracking-[0.16em] pt-2 ${
                    isActive ? 'text-[#B8FF2E]' : 'text-[#6E8275]'
                  }`}
                >
                  PHASE {item.num}
                </span>
              </div>

              <div className="mt-10 space-y-3">
                <h3 className="font-display text-2xl font-extrabold tracking-tight text-[#F4F7F4]">
                  {item.title}
                </h3>
                <p className="text-sm font-medium text-[#D4DFD7] leading-relaxed">
                  {item.summary}
                </p>
                <p
                  className={`text-xs leading-relaxed transition-opacity duration-200 ${
                    isActive ? 'text-[#9FB2A5] opacity-100' : 'text-[#6E8275] opacity-80'
                  }`}
                >
                  {item.detail}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

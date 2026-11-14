import React from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export const TechnologySection: React.FC = () => {
  return (
    <section
      id="about"
      className="py-24 lg:py-32 px-5 md:px-10 max-w-[1440px] mx-auto border-t border-white/[0.08]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 space-y-5"
        >
          <div className="font-mono-tabular text-xs tracking-[0.2em] text-[#B8FF2E]">
            06 · ARCHITECTURAL STACK
          </div>
          <h2 className="font-display font-black text-[clamp(2rem,3.8vw,3.4rem)] leading-[1.0] tracking-[-0.03em] text-[#F4F7F4] text-balance">
            ENGINEERED FOR AUTONOMOUS AGENT COORDINATION.
          </h2>
          <p className="text-sm text-[#9FB2A5] leading-relaxed">
            Aegis pairs distributed agent orchestration with a hardened
            language-model gateway so intelligence exchange remains auditable,
            rate-bounded, and deterministic.
          </p>
          <p className="font-mono-tabular text-xs text-[#6E8275]">
            Conceptual frontend architecture diagram — no live external integration active.
          </p>
        </motion.div>

        {/* Visual Integration Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7"
        >
          <div className="rounded-2xl border border-white/12 bg-[#08130D] p-6 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-11 gap-6 items-center">
              {/* MARITIME */}
              <div className="md:col-span-5 rounded-xl border border-[#10B981]/30 bg-[#0A1A12] p-6 space-y-3">
                <div className="font-mono-tabular text-xs tracking-[0.18em] text-[#34D399]">
                  LAYER 01 · AGENT RUNTIME
                </div>
                <h3 className="font-display text-2xl font-extrabold text-[#F4F7F4]">
                  MARITIME
                </h3>
                <p className="text-sm text-[#9FB2A5] leading-relaxed">
                  Infrastructure for hosting and managing independent AI agents
                  across isolated office, database, application, and backup
                  environments.
                </p>
                <div className="pt-2 font-mono-tabular text-[11px] text-[#6E8275]">
                  Lifecycle · Identity Keys · Mesh Discovery
                </div>
              </div>

              {/* Bridge Connector */}
              <div className="md:col-span-1 flex md:flex-col items-center justify-center gap-2 text-[#B8FF2E]">
                <span className="hidden md:block w-px h-6 bg-[#B8FF2E]/40" />
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
                <span className="hidden md:block w-px h-6 bg-[#B8FF2E]/40" />
              </div>

              {/* PRUNE */}
              <div className="md:col-span-5 rounded-xl border border-[#B8FF2E]/35 bg-[#0C1D13] p-6 space-y-3">
                <div className="font-mono-tabular text-xs tracking-[0.18em] text-[#B8FF2E]">
                  LAYER 02 · MODEL GATEWAY
                </div>
                <h3 className="font-display text-2xl font-extrabold text-[#F4F7F4]">
                  PRUNE
                </h3>
                <p className="text-sm text-[#9FB2A5] leading-relaxed">
                  AI gateway for securing, optimizing, and monitoring
                  language-model API calls with payload sanitization and spend
                  governance.
                </p>
                <div className="pt-2 font-mono-tabular text-[11px] text-[#6E8275]">
                  Policy Filter · Token Guard · Cost Telemetry
                </div>
              </div>
            </div>

            {/* Bottom Flow Summary */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="font-mono-tabular text-xs text-[#6E8275]">
                  Evidence Exchange
                </div>
                <div className="text-sm font-semibold text-[#F4F7F4] mt-1">
                  Signed Digest Relay
                </div>
              </div>
              <div>
                <div className="font-mono-tabular text-xs text-[#6E8275]">
                  Gateway Guardrail
                </div>
                <div className="text-sm font-semibold text-[#F4F7F4] mt-1">
                  Prompt &amp; PII Redaction
                </div>
              </div>
              <div>
                <div className="font-mono-tabular text-xs text-[#6E8275]">
                  Quorum Output
                </div>
                <div className="text-sm font-semibold text-[#B8FF2E] mt-1">
                  Confidence-Scored Action
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

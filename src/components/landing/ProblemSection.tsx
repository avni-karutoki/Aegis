import React, { useState } from 'react';
import { motion } from 'motion/react';

export const ProblemSection: React.FC = () => {
  const [mode, setMode] = useState<'isolated' | 'mesh'>('mesh');

  const nodes = [
    { id: 'A', label: 'Office Server', x: 110, y: 80, alert: true },
    { id: 'B', label: 'Database Server', x: 350, y: 72, alert: false },
    { id: 'C', label: 'Application Server', x: 365, y: 245, alert: false },
    { id: 'D', label: 'Backup Server', x: 105, y: 240, alert: false },
  ];

  const links: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ];

  return (
    <section
      id="platform"
      className="py-24 lg:py-32 px-5 md:px-10 max-w-[1440px] mx-auto border-t border-white/[0.08]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left: Oversized Editorial Copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 space-y-8"
        >
          <div className="font-mono-tabular text-xs tracking-[0.2em] text-[#B8FF2E]">
            01 · THE ISOLATION PROBLEM
          </div>

          <h2 className="font-display font-extrabold text-[clamp(2.25rem,4.5vw,4.1rem)] leading-[0.98] tracking-[-0.03em] text-[#F4F7F4] text-balance">
            ONE SYSTEM SEES A SIGNAL.{' '}
            <span className="text-[#9FB2A5]">THE NETWORK SEES THE THREAT.</span>
          </h2>

          <div className="space-y-4 text-base text-[#9FB2A5] leading-relaxed max-w-xl">
            <p>
              Traditional security systems often operate independently. Important
              intelligence can remain isolated inside a single endpoint, and
              unverified alerts create confusion across engineering teams.
            </p>
            <p className="text-[#D4DFD7]">
              Aegis enables independent agents to exchange and evaluate
              security intelligence collaboratively—separating coordinated
              threats from false positives before escalation.
            </p>
          </div>

          {/* Interactive Comparison Switch */}
          <div className="inline-flex items-center p-1 bg-[#0A160F] border border-white/10 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('isolated')}
              className={`px-4 py-2 text-xs font-semibold tracking-[0.08em] uppercase rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'isolated'
                  ? 'bg-[#EF4444]/20 text-[#FCA5A5] border border-[#EF4444]/40'
                  : 'text-[#9FB2A5] hover:text-[#F4F7F4]'
              }`}
            >
              Isolated Silos
            </button>
            <button
              type="button"
              onClick={() => setMode('mesh')}
              className={`px-4 py-2 text-xs font-semibold tracking-[0.08em] uppercase rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'mesh'
                  ? 'bg-[#B8FF2E] text-[#050A07]'
                  : 'text-[#9FB2A5] hover:text-[#F4F7F4]'
              }`}
            >
              Aegis Consensus
            </button>
          </div>
        </motion.div>

        {/* Right: Interactive Architectural Topology Transition */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6"
        >
          <div className="relative rounded-2xl border border-white/10 bg-[#08120C] p-6 sm:p-8 overflow-hidden">
            <div className="flex items-center justify-between gap-4 pb-5 border-b border-white/10">
              <div>
                <div className="font-display text-lg font-bold text-[#F4F7F4]">
                  {mode === 'isolated'
                    ? 'Disconnected Endpoint View'
                    : 'Collaborative Mesh Verification'}
                </div>
                <div className="font-mono-tabular text-xs text-[#9FB2A5] mt-0.5">
                  {mode === 'isolated'
                    ? 'Signal trapped on Office Server · 0 peer corroborations'
                    : '4 agents cross-verifying · 94.6% threat confidence'}
                </div>
              </div>
              <div
                className={`font-mono-tabular text-xs font-semibold ${
                  mode === 'isolated' ? 'text-[#F59E0B]' : 'text-[#B8FF2E]'
                }`}
              >
                {mode === 'isolated' ? 'AMBIGUOUS' : 'VERIFIED'}
              </div>
            </div>

            <div className="mt-6">
              <svg
                viewBox="0 0 470 320"
                className="w-full h-auto"
                role="img"
                aria-label="Comparison between isolated security silos and Aegis consensus"
              >
                {/* Mesh Connections */}
                {links.map(([i, j], idx) => {
                  const a = nodes[i];
                  const b = nodes[j];
                  return (
                    <motion.line
                      key={idx}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={mode === 'mesh' ? '#B8FF2E' : '#334155'}
                      strokeWidth={mode === 'mesh' ? 1.75 : 1}
                      strokeDasharray={mode === 'mesh' ? '0' : '5 6'}
                      initial={false}
                      animate={{
                        opacity: mode === 'mesh' ? 0.65 : 0.2,
                      }}
                      transition={{ duration: 0.35 }}
                    />
                  );
                })}

                {/* Central Consensus Ring */}
                <motion.circle
                  cx={235}
                  cy={160}
                  r={46}
                  fill="none"
                  stroke={mode === 'mesh' ? '#10B981' : '#334155'}
                  strokeWidth={1.25}
                  strokeDasharray="4 4"
                  initial={false}
                  animate={{
                    opacity: mode === 'mesh' ? 0.9 : 0.12,
                    scale: mode === 'mesh' ? 1 : 0.85,
                  }}
                  style={{ transformOrigin: '235px 160px' }}
                  transition={{ duration: 0.4 }}
                />

                <text
                  x={235}
                  y={156}
                  textAnchor="middle"
                  fill={mode === 'mesh' ? '#B8FF2E' : '#64748B'}
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {mode === 'mesh' ? 'QUORUM' : 'NO LINK'}
                </text>
                <text
                  x={235}
                  y={172}
                  textAnchor="middle"
                  fill={mode === 'mesh' ? '#F4F7F4' : '#475569'}
                  fontSize="12"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {mode === 'mesh' ? '4 / 4' : '1 / 4'}
                </text>

                {/* Agent Nodes */}
                {nodes.map((node) => {
                  const isAlert = node.alert;
                  const fill =
                    mode === 'isolated'
                      ? isAlert
                        ? '#F59E0B'
                        : '#1E293B'
                      : '#B8FF2E';
                  const stroke =
                    mode === 'isolated'
                      ? isAlert
                        ? '#F59E0B'
                        : '#475569'
                      : '#10B981';

                  return (
                    <g key={node.id}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={26}
                        fill="#09150E"
                        stroke={stroke}
                        strokeWidth={1.5}
                      />
                      <circle cx={node.x} cy={node.y} r={8} fill={fill} />
                      <text
                        x={node.x}
                        y={node.y + 42}
                        textAnchor="middle"
                        fill="#F4F7F4"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="Plus Jakarta Sans, sans-serif"
                      >
                        Agent {node.id} · {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

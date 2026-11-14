import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Play, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { useSimulation } from '../../context/SimulationContext';
import { AgentId } from '../../types/sentinel';
import { HeroSphere3D } from '../three/HeroSphere3D';

interface HeroSectionProps {
  onExploreNetwork: () => void;
  onOpenDashboard: () => void;
}

const NODE_ORDER: AgentId[] = ['A', 'B', 'C', 'D'];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreNetwork,
  onOpenDashboard,
}) => {
  const {
    agents,
    selectedAgentId,
    setSelectedAgentId,
    averageNetworkTrust,
    scenario,
    step,
    simulateThreat,
  } = useSimulation();

  const [globeResetCount, setGlobeResetCount] = useState(0);
  const [isGlobeTransformed, setIsGlobeTransformed] = useState(false);

  const activeAgent = agents.find((a) => a.id === selectedAgentId) ?? agents[0];

  const cycleNode = (dir: -1 | 1) => {
    const idx = NODE_ORDER.indexOf(selectedAgentId);
    const nextIdx = (idx + dir + NODE_ORDER.length) % NODE_ORDER.length;
    setSelectedAgentId(NODE_ORDER[nextIdx]);
  };

  const verificationText =
    step === 'idle'
      ? 'VERIFICATION IN PROGRESS'
      : step === 'resolved'
      ? scenario === 'unreliable'
        ? 'UNRELIABLE CLAIM FLAGGED'
        : 'CONSENSUS VERIFIED'
      : `MESH ${step.toUpperCase()}`;

  return (
    <section
      id="top"
      className="relative px-3 sm:px-6 pt-3 pb-10 max-w-[1440px] mx-auto"
    >
      <div className="relative w-full min-h-[640px] lg:min-h-[760px] rounded-2xl border border-white/12 emerald-radial-stage overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-12 shadow-[0_32px_90px_rgba(0,0,0,0.85)]">
        {/* Top Floating Integrated Indicators */}
        <div className="relative z-30 flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-1">
            <div className="font-mono-tabular text-xs tracking-[0.18em] text-[#B8FF2E]">
              04 AGENTS CONNECTED
            </div>
            <div className="font-mono-tabular text-xs tracking-[0.14em] text-[#9FB2A5]">
              NETWORK TRUST{' '}
              <span className="text-[#F4F7F4] font-semibold">
                {averageNetworkTrust.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="font-mono-tabular text-xs tracking-[0.18em] text-[#34D399]">
              THREAT INTELLIGENCE ACTIVE
            </div>
            <div className="font-mono-tabular text-xs tracking-[0.14em] text-[#9FB2A5]">
              {verificationText}
            </div>
          </div>
        </div>

        {/* Center Layered Composition: Wrapped Display Typography + Central 3D Sphere */}
        <div className="relative flex-1 flex flex-col items-center justify-center my-4 min-h-[420px] lg:min-h-[500px]">
          <div className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-4">
            <span className="font-mono-tabular text-[11px] tracking-[0.28em] text-[#9FB2A5] [writing-mode:vertical-rl] rotate-180">
              SCROLL DOWN
            </span>
            <span className="w-px h-14 bg-gradient-to-b from-[#B8FF2E]/70 to-transparent" />
          </div>

          <h1 className="sr-only">
            Trust is not given. It&apos;s verified.
          </h1>

          {/* Upper Wrapped Headline Layer: lower letter edges tuck behind the sphere rim */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none relative z-10 w-full max-w-5xl mx-auto px-2 sm:px-28 lg:px-36 text-center select-none"
          >
            <span className="block font-display font-black uppercase tracking-[-0.035em] leading-[0.92] text-[clamp(2.25rem,5.4vw,4.85rem)] text-[#F4F7F4] break-words text-balance drop-shadow-[0_6px_28px_rgba(5,10,7,0.9)]">
              TRUST IS NOT GIVEN.
            </span>
          </motion.div>

          {/* Central 3D Sphere Layer: generous stage for free 360° rotation & movement without clipping */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 w-full max-w-[680px] sm:max-w-[820px] lg:max-w-[960px] h-[340px] sm:h-[420px] lg:h-[490px] -my-28 sm:-my-34 lg:-my-40 flex items-center justify-center"
          >
            <HeroSphere3D
              selectedAgentId={selectedAgentId}
              scenario={scenario}
              step={step}
              onSelectAgent={setSelectedAgentId}
              resetTrigger={globeResetCount}
              onUserTransformChange={setIsGlobeTransformed}
            />
          </motion.div>

          {/* Lower Wrapped Headline Layer: upper letter edges tuck behind the sphere rim */}
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none relative z-10 w-full max-w-5xl mx-auto px-2 sm:px-28 lg:px-36 text-center select-none"
          >
            <span className="block font-display font-black uppercase tracking-[-0.035em] leading-[0.92] text-[clamp(2.4rem,6vw,5.4rem)] text-[#B8FF2E] break-words text-balance drop-shadow-[0_6px_28px_rgba(5,10,7,0.9)]">
              IT&apos;S VERIFIED.
            </span>
          </motion.div>

          <div
            aria-label="Select mesh node"
            className="hidden sm:flex flex-col gap-2.5 absolute right-0 top-1/2 -translate-y-1/2 z-30"
          >
            {NODE_ORDER.map((id) => {
              const node = agents.find((a) => a.id === id);
              const isSelected = selectedAgentId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedAgentId(id)}
                  className={`group flex items-center justify-end gap-3 py-1.5 pl-3 pr-2 rounded-md border transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'border-[#B8FF2E] bg-[#0B1E14]/90 text-[#F4F7F4]'
                      : 'border-white/10 bg-[#060F0A]/80 text-[#9FB2A5] hover:border-white/30 hover:text-[#F4F7F4]'
                  }`}
                >
                  <span className="font-mono-tabular text-[11px] tracking-[0.14em]">
                    NODE {id}
                  </span>
                  <span
                    className={`font-mono-tabular text-[11px] ${
                      isSelected ? 'text-[#B8FF2E]' : 'text-[#6E8275]'
                    }`}
                  >
                    {node?.trustScore.toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Integrated Editorial Bar */}
        <div className="relative z-30 grid grid-cols-1 lg:grid-cols-12 items-end gap-6 pt-4 border-t border-white/10">
          <div className="lg:col-span-5 space-y-4">
            <p className="font-mono-tabular text-xs tracking-[0.16em] text-[#9FB2A5] max-w-md">
              INTELLIGENCE IS STRONGER WHEN IT IS VERIFIED TOGETHER.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExploreNetwork}
                className="inline-flex items-center gap-2.5 px-5 py-3 text-xs font-bold tracking-[0.14em] uppercase bg-[#F4F7F4] text-[#050A07] rounded-md hover:bg-[#B8FF2E] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Explore The Network</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={simulateThreat}
                className="inline-flex items-center gap-2 px-4 py-3 text-xs font-semibold tracking-[0.12em] uppercase border border-[#B8FF2E]/45 text-[#B8FF2E] bg-[#08150E]/90 rounded-md hover:bg-[#B8FF2E] hover:text-[#050A07] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Simulate Threat</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col items-start lg:items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => cycleNode(-1)}
                aria-label="Previous node"
                className="w-10 h-10 inline-flex items-center justify-center rounded-md border border-white/15 bg-[#07110B] text-[#F4F7F4] hover:border-[#B8FF2E] hover:text-[#B8FF2E] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="font-mono-tabular text-xs tracking-[0.14em] text-[#9FB2A5] px-2">
                {selectedAgentId} / D
              </span>
              <button
                type="button"
                onClick={() => cycleNode(1)}
                aria-label="Next node"
                className="w-10 h-10 inline-flex items-center justify-center rounded-md border border-white/15 bg-[#07110B] text-[#F4F7F4] hover:border-[#B8FF2E] hover:text-[#B8FF2E] transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {isGlobeTransformed ? (
              <button
                type="button"
                onClick={() => setGlobeResetCount((c) => c + 1)}
                className="inline-flex items-center gap-1.5 font-mono-tabular text-[10px] uppercase tracking-[0.14em] text-[#B8FF2E] hover:text-[#F4F7F4] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Reset Globe</span>
              </button>
            ) : (
              <span className="font-mono-tabular text-[10px] uppercase tracking-[0.12em] text-[#6E8275] whitespace-nowrap">
                Drag Spin · Shift-Drag Move
              </span>
            )}
          </div>

          <div className="lg:col-span-5 lg:text-right space-y-1.5">
            <div className="flex lg:justify-end items-center gap-2 font-mono-tabular text-xs text-[#B8FF2E]">
              <span>{activeAgent.name}</span>
              <span aria-hidden="true">·</span>
              <span>Trust {activeAgent.trustScore.toFixed(1)}%</span>
            </div>
            <p className="text-sm text-[#9FB2A5] leading-relaxed max-w-md lg:ml-auto">
              {activeAgent.currentActivity}.{' '}
              <button
                type="button"
                onClick={onOpenDashboard}
                className="text-[#F4F7F4] underline decoration-[#B8FF2E]/60 underline-offset-4 hover:text-[#B8FF2E] cursor-pointer"
              >
                Open console
              </button>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

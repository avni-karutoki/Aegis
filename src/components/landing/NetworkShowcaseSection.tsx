import React from 'react';
import { Play, RotateCcw, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { useSimulation } from '../../context/SimulationContext';
import { NetworkGraph3D } from '../three/NetworkGraph3D';

export const NetworkShowcaseSection: React.FC = () => {
  const {
    agents,
    selectedAgentId,
    setSelectedAgentId,
    hoveredAgentId,
    setHoveredAgentId,
    activePacketPaths,
    scenario,
    step,
    statusMessage,
    simulateThreat,
    simulateUnreliableReport,
    resetSimulation,
  } = useSimulation();

  const inspectedId = hoveredAgentId ?? selectedAgentId;
  const inspectedAgent =
    agents.find((a) => a.id === inspectedId) ?? agents[0];

  const statusTone = (status: string) => {
    switch (status) {
      case 'Alert':
        return 'text-[#F59E0B]';
      case 'Caution':
        return 'text-[#EF4444]';
      case 'Verifying':
        return 'text-[#B8FF2E]';
      default:
        return 'text-[#34D399]';
    }
  };

  return (
    <section
      id="network"
      className="py-24 lg:py-32 px-5 md:px-10 max-w-[1440px] mx-auto border-t border-white/[0.08]"
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-10"
      >
        <div className="space-y-3 max-w-2xl">
          <div className="font-mono-tabular text-xs tracking-[0.2em] text-[#B8FF2E]">
            03 · INTERACTIVE 3D MESH TOPOLOGY
          </div>
          <h2 className="font-display font-black text-[clamp(2.2rem,4.4vw,3.9rem)] leading-[0.98] tracking-[-0.03em] text-[#F4F7F4] text-balance">
            FOUR INDEPENDENT AGENTS. ONE VERIFIED TRUTH.
          </h2>
          <p className="text-sm text-[#9FB2A5] leading-relaxed">
            Hover or click any 3D server node below to inspect live telemetry, or
            trigger a simulated scenario to watch Aegis intelligence exchange in
            action.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={simulateThreat}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-[0.12em] uppercase bg-[#B8FF2E] text-[#050A07] rounded-md hover:bg-[#d0ff6b] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Simulate Threat</span>
          </button>

          <button
            type="button"
            onClick={simulateUnreliableReport}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-[0.1em] uppercase border border-[#F59E0B]/50 bg-[#1B1406] text-[#FCD34D] rounded-md hover:bg-[#F59E0B] hover:text-[#050A07] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Simulate Unreliable Report</span>
          </button>

          <button
            type="button"
            onClick={resetSimulation}
            aria-label="Reset simulation"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium tracking-[0.08em] uppercase border border-white/15 text-[#9FB2A5] hover:text-[#F4F7F4] hover:border-white/30 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </motion.div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-5 rounded-lg border border-white/10 bg-[#08120C]">
        <div className="flex items-center gap-3">
          <span className="font-mono-tabular text-[11px] uppercase tracking-[0.16em] text-[#B8FF2E] shrink-0">
            Simulation Feed
          </span>
          <span className="text-[#6E8275]" aria-hidden="true">
            /
          </span>
          <span className="text-sm text-[#F4F7F4]">{statusMessage}</span>
        </div>
        <span className="font-mono-tabular text-[11px] text-[#6E8275] shrink-0">
          Frontend Mock Telemetry
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl border border-white/12 bg-[#060E09] studio-grid-bg overflow-hidden"
      >
        <div className="relative h-[520px] lg:h-[580px] w-full">
          <NetworkGraph3D
            agents={agents}
            selectedAgentId={selectedAgentId}
            hoveredAgentId={hoveredAgentId}
            activePacketPaths={activePacketPaths}
            scenario={scenario}
            step={step}
            onSelectAgent={setSelectedAgentId}
            onHoverAgent={setHoveredAgentId}
          />

          <div className="pointer-events-auto absolute bottom-5 left-5 right-5 lg:right-auto lg:w-[390px] rounded-xl border border-white/15 bg-[#07110B]/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10">
              <div>
                <div className="font-mono-tabular text-[11px] tracking-[0.14em] text-[#9FB2A5]">
                  {inspectedAgent.host}
                </div>
                <h3 className="font-display text-lg font-bold text-[#F4F7F4] mt-0.5">
                  {inspectedAgent.name}
                </h3>
              </div>
              <span
                className={`font-mono-tabular text-xs font-semibold uppercase tracking-[0.1em] ${statusTone(
                  inspectedAgent.status
                )}`}
              >
                {inspectedAgent.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 py-3.5 border-b border-white/10">
              <div>
                <div className="text-[11px] text-[#6E8275]">Trust Score</div>
                <div className="font-mono-tabular text-lg font-bold text-[#B8FF2E] mt-0.5">
                  {inspectedAgent.trustScore.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#6E8275]">Reports</div>
                <div className="font-mono-tabular text-lg font-bold text-[#F4F7F4] mt-0.5">
                  {inspectedAgent.reportsSubmitted}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#6E8275]">Last Active</div>
                <div className="font-mono-tabular text-sm font-medium text-[#D4DFD7] mt-1.5">
                  {inspectedAgent.lastActive}
                </div>
              </div>
            </div>

            <div className="pt-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[#6E8275]">
                Current Activity
              </div>
              <p className="text-xs text-[#D4DFD7] leading-relaxed mt-1">
                {inspectedAgent.currentActivity}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-white/10 divide-y lg:divide-y-0 lg:divide-x divide-white/10 bg-[#07110B]">
          {agents.map((agent) => {
            const isSelected = selectedAgentId === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => setSelectedAgentId(agent.id)}
                onMouseEnter={() => setHoveredAgentId(agent.id)}
                onMouseLeave={() => setHoveredAgentId(null)}
                className={`text-left px-5 py-4 transition-colors duration-150 cursor-pointer ${
                  isSelected ? 'bg-[#0E2216]' : 'hover:bg-[#0A1810]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-mono-tabular text-xs font-semibold ${
                      isSelected ? 'text-[#B8FF2E]' : 'text-[#9FB2A5]'
                    }`}
                  >
                    {agent.code}
                  </span>
                  <span
                    className={`font-mono-tabular text-xs ${statusTone(
                      agent.status
                    )}`}
                  >
                    {agent.status}
                  </span>
                </div>
                <div className="font-display text-sm font-bold text-[#F4F7F4] mt-1 truncate">
                  {agent.name.replace(`Agent ${agent.id} — `, '')}
                </div>
                <div className="font-mono-tabular text-xs text-[#6E8275] mt-0.5">
                  Trust {agent.trustScore.toFixed(1)}% · {agent.reportsSubmitted} reports
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
};

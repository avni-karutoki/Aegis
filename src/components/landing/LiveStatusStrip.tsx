import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { api, type PruneStats } from '../../lib/api';
import { useBackend } from '../../context/BackendContext';

interface StatusData {
  agents: number;
  stats: PruneStats | null;
}

/**
 * Live platform status strip on the landing page — pulls REAL figures from
 * the backend (mesh registry + Prune gateway telemetry). Hidden content
 * degrades to a quiet "simulation mode" line when the backend is offline.
 */
export const LiveStatusStrip: React.FC = () => {
  const { online } = useBackend();
  const [data, setData] = useState<StatusData>({ agents: 0, stats: null });

  const load = useCallback(async () => {
    try {
      const [agentsRes, stats] = await Promise.all([
        api.maritimeAgents(),
        api.pruneStats(),
      ]);
      setData({ agents: agentsRes.count, stats });
    } catch {
      /* backend briefly unreachable — keep last known values */
    }
  }, []);

  useEffect(() => {
    if (!online) return;
    void load();
    const id = window.setInterval(() => void load(), 8_000);
    return () => window.clearInterval(id);
  }, [online, load]);

  return (
    <section className="border-y border-white/[0.08] bg-[#070F0A]/80">
      <div className="max-w-[1440px] mx-auto px-5 md:px-10 py-4">
        {online && data.stats ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-x-8 gap-y-3 flex-wrap font-mono-tabular text-[11px] tracking-[0.1em] uppercase"
          >
            <span className="inline-flex items-center gap-2 text-[#34D399] shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
              Platform Live
            </span>
            <span className="text-[#9FB2A5]">
              Mesh:{' '}
              <span className="text-[#F4F7F4]">{data.agents} agents</span>
            </span>
            <span className="text-[#9FB2A5]">
              Gateway calls:{' '}
              <span className="text-[#F4F7F4]">
                {data.stats.totalRequests.toLocaleString()}
              </span>
            </span>
            <span className="text-[#9FB2A5]">
              Blocked at policy:{' '}
              <span className="text-[#F59E0B]">
                {data.stats.blockedRequests}
              </span>
            </span>
            <span className="text-[#9FB2A5]">
              PII redactions:{' '}
              <span className="text-[#B8FF2E]">
                {data.stats.redactionsTotal}
              </span>
            </span>
            <span className="text-[#9FB2A5]">
              Model:{' '}
              <span className="text-[#F4F7F4]">
                {data.stats.geminiConfigured ? 'Gemini live' : 'deterministic guard'}
              </span>
            </span>
          </motion.div>
        ) : (
          <div className="flex items-center gap-2 font-mono-tabular text-[11px] tracking-[0.1em] uppercase text-[#6E8275]">
            <span className="w-2 h-2 rounded-full bg-[#6E8275]" />
            Simulation mode — start the backend for live mesh &amp; gateway telemetry
          </div>
        )}
      </div>
    </section>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Fingerprint,
  HeartPulse,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import {
  api,
  type MaritimeAgentSummary,
  type MaritimeJoinResult,
} from '../../lib/api';

const LIFECYCLE_TONE: Record<string, string> = {
  active: 'text-[#34D399] border-[#34D399]/40 bg-[#34D399]/10',
  registered: 'text-[#B8FF2E] border-[#B8FF2E]/40 bg-[#B8FF2E]/10',
  suspended: 'text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10',
  retired: 'text-[#9FB2A5] border-white/20 bg-white/5',
};

function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 5_000) return 'just now';
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

export const MaritimePanel: React.FC = () => {
  const [agents, setAgents] = useState<MaritimeAgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinResult, setJoinResult] = useState<MaritimeJoinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.maritimeAgents();
      setAgents(res.agents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Runtime unreachable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(id);
  }, [load]);

  const joinMesh = async () => {
    setJoining(true);
    setError(null);
    try {
      const result = await api.maritimeDemoRegister({
        name: `Federation Agent ${new Date().toISOString().slice(11, 19)}`,
      });
      setJoinResult(result);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Join failed');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#08120C] p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-bold text-[#F4F7F4]">
            MARITIME Agent Runtime
          </h2>
          <p className="text-xs text-[#9FB2A5] mt-1">
            Layer 01 — real ed25519 identities, challenge-signed heartbeats,
            lifecycle governance. Live registry from the backend.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#9FB2A5] border border-white/10 rounded-md hover:text-[#F4F7F4] hover:border-white/25 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void joinMesh()}
            disabled={joining}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] bg-[#B8FF2E] text-[#050A07] rounded-md hover:bg-[#ccff5c] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {joining ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            Join Mesh (demo)
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {joinResult && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-[#B8FF2E]/40 bg-[#B8FF2E]/5 p-4"
        >
          <div className="font-mono-tabular text-xs font-bold text-[#B8FF2E] uppercase">
            Agent {joinResult.agent.id} joined the mesh
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-[11px] font-mono-tabular text-[#9FB2A5]">
            <span>registered: {String(joinResult.joinFlow.registered)}</span>
            <span>challenge: issued</span>
            <span>
              signature:{' '}
              <span className={joinResult.joinFlow.signatureVerified ? 'text-[#34D399]' : 'text-red-400'}>
                {joinResult.joinFlow.signatureVerified ? 'verified ✓' : 'rejected'}
              </span>
            </span>
            <span>lifecycle: {joinResult.joinFlow.lifecycle}</span>
          </div>
          <div className="mt-2 flex items-start gap-2 text-[10px] text-[#6E8275] font-mono-tabular">
            <Fingerprint className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            identity fingerprint {joinResult.agent.fingerprint} — private key delivered
            once to the agent host, never again leaves it.
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[#9FB2A5] py-4">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Reading runtime registry…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg border border-white/10 bg-[#050A07] p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono-tabular text-xs font-bold text-[#F4F7F4]">
                  {agent.code} · {agent.host}
                </div>
                <span
                  className={`px-2 py-0.5 rounded font-mono-tabular text-[10px] uppercase border ${LIFECYCLE_TONE[agent.lifecycle] ?? ''}`}
                >
                  {agent.lifecycle}
                </span>
              </div>
              <div className="text-[11px] text-[#9FB2A5]">{agent.role}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono-tabular text-[10px] text-[#6E8275]">
                <span className="inline-flex items-center gap-1">
                  <Fingerprint className="w-3 h-3" aria-hidden="true" />
                  {agent.fingerprint}
                </span>
                <span className="inline-flex items-center gap-1">
                  <HeartPulse className="w-3 h-3" aria-hidden="true" />
                  {agent.heartbeats} beats · {relativeTime(agent.lastHeartbeat)}
                </span>
                <span className="inline-flex items-center gap-1 text-[#34D399]">
                  <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                  trust {agent.trustScore.toFixed(1)}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

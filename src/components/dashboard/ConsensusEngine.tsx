import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  Check,
  FileSignature,
  Loader2,
  Play,
  Radio,
  Scale,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import {
  api,
  type ConsensusBroadcast,
  type ConsensusInit,
  type ConsensusPeerVerdict,
  type ConsensusResult,
} from '../../lib/api';

type Stage = 0 | 1 | 2 | 3 | 4;
type Scenario = 'threat' | 'unreliable' | 'custom';

const EASE = [0.16, 1, 0.3, 1] as const;

const STAGES: Array<{ id: Stage; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 1, label: 'Detect & Sign', icon: FileSignature },
  { id: 2, label: 'Mesh Broadcast', icon: Radio },
  { id: 3, label: 'Peer Verification', icon: ShieldCheck },
  { id: 4, label: 'Quorum Consensus', icon: Scale },
];

/** Small count-up animation for the confidence figure — no bounce, just easing. */
function AnimatedConfidence({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{display.toFixed(1)}</>;
}

export const ConsensusEngine: React.FC = () => {
  const [scenario, setScenario] = useState<Scenario>('threat');
  const [customPayload, setCustomPayload] = useState('');
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<Stage>(0);
  const [init, setInit] = useState<ConsensusInit | null>(null);
  const [broadcast, setBroadcast] = useState<ConsensusBroadcast | null>(null);
  const [verdicts, setVerdicts] = useState<ConsensusPeerVerdict[] | null>(null);
  const [result, setResult] = useState<ConsensusResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const run = async () => {
    if (scenario === 'custom' && customPayload.trim().length === 0) return;
    setRunning(true);
    setError(null);
    setInit(null);
    setBroadcast(null);
    setVerdicts(null);
    setResult(null);
    setStage(0);
    try {
      // Stage 1 — detect & sign
      const session = await api.consensusInit({
        scenario,
        customPayload: scenario === 'custom' ? customPayload : undefined,
      });
      setInit(session);
      setStage(1);
      await wait(900);

      // Stage 2 — mesh broadcast
      const b = await api.consensusBroadcast(session.sessionId);
      setBroadcast(b);
      setStage(2);
      await wait(1100);

      // Stage 3 — peer verification (real Prune-governed model calls)
      const v = await api.consensusVerify(session.sessionId);
      setVerdicts(v.evaluations);
      setStage(3);
      await wait(1200);

      // Stage 4 — quorum consensus + trust recalibration
      const r = await api.consensusResult(session.sessionId);
      setResult(r);
      setStage(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Consensus run failed');
    } finally {
      setRunning(false);
    }
  };

  const stageActive = (id: Stage) => stage >= id;
  const stageCurrent = (id: Stage) => stage === id && running;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-2xl font-bold text-[#F4F7F4]">
            Consensus Engine
          </h1>
          <span className="px-2 py-0.5 rounded border border-[#B8FF2E]/40 bg-[#B8FF2E]/10 font-mono-tabular text-[10px] uppercase tracking-[0.14em] text-[#B8FF2E]">
            USP · Live
          </span>
        </div>
        <p className="text-sm text-[#9FB2A5] mt-1">
          No single agent can raise an alert. Watch the mesh sign evidence,
          verify independently through the Prune gateway, and reach quorum —
          every step below is a real backend call.
        </p>
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-white/10 bg-[#08120C] p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'threat', label: 'Coordinated intrusion' },
              { id: 'unreliable', label: 'Unreliable report' },
              { id: 'custom', label: 'Custom telemetry' },
            ] as Array<{ id: Scenario; label: string }>
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScenario(s.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors duration-150 cursor-pointer ${
                scenario === s.id
                  ? 'border-[#B8FF2E]/60 bg-[#B8FF2E]/10 text-[#B8FF2E]'
                  : 'border-white/10 text-[#9FB2A5] hover:text-[#F4F7F4] hover:border-white/25'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {scenario === 'custom' && (
            <motion.textarea
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="Paste raw telemetry. Tip: include 'packet hash match' and 'flow record' for corroboration, or 'no matching' / 'missing' to get flagged."
              className="w-full bg-[#050A07] border border-white/10 rounded-lg p-3.5 font-mono-tabular text-xs text-[#C9D6CC] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#B8FF2E]/50 resize-y overflow-hidden"
            />
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => void run()}
          disabled={running || (scenario === 'custom' && customPayload.trim().length === 0)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold tracking-[0.1em] uppercase bg-[#B8FF2E] text-[#050A07] rounded-md hover:bg-[#ccff5c] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {running ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="w-4 h-4" aria-hidden="true" />
          )}
          {running ? 'Mesh in session…' : 'Run Live Consensus'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Stage tracker */}
      <div className="rounded-xl border border-white/10 bg-[#08120C] px-6 py-5">
        <div className="flex items-center">
          {STAGES.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2.5 shrink-0">
                <motion.div
                  animate={{
                    borderColor: stageActive(s.id)
                      ? 'rgba(184,255,46,0.6)'
                      : 'rgba(255,255,255,0.12)',
                    backgroundColor: stageActive(s.id)
                      ? 'rgba(184,255,46,0.08)'
                      : 'rgba(255,255,255,0.02)',
                  }}
                  transition={{ duration: 0.4 }}
                  className="w-9 h-9 rounded-lg border flex items-center justify-center"
                >
                  {stage > s.id ? (
                    <Check className="w-4 h-4 text-[#34D399]" aria-hidden="true" />
                  ) : (
                    <s.icon
                      className={`w-4 h-4 ${stageCurrent(s.id) ? 'text-[#B8FF2E]' : 'text-[#6E8275]'}`}
                      aria-hidden="true"
                    />
                  )}
                </motion.div>
                <span
                  className={`hidden md:block text-[11px] font-medium uppercase tracking-[0.1em] transition-colors duration-300 ${
                    stageActive(s.id) ? 'text-[#F4F7F4]' : 'text-[#6E8275]'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="flex-1 h-px mx-3 bg-white/10 relative overflow-hidden rounded">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-[#B8FF2E]/60"
                    animate={{ width: stageActive(STAGES[i + 1].id) ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: EASE }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STAGE 1 — Evidence */}
      <AnimatePresence>
        {init && stage >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="rounded-xl border border-white/10 bg-[#08120C] p-6 space-y-3"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-[#B8FF2E]" aria-hidden="true" />
                <span className="font-display text-sm font-bold text-[#F4F7F4]">
                  Stage 1 · Evidence signed by Agent {init.origin}
                </span>
              </div>
              <span className="font-mono-tabular text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded border border-[#34D399]/40 bg-[#34D399]/10 text-[#34D399]">
                {init.signatureAlgorithm}
              </span>
            </div>
            <p className="text-xs text-[#9FB2A5]">{init.title} — {init.eventId}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono-tabular text-[11px]">
              <div className="rounded-lg border border-white/10 bg-[#050A07] p-3">
                <div className="text-[#6E8275] uppercase tracking-[0.1em] text-[10px] mb-1">
                  SHA-256 Evidence Digest
                </div>
                <div className="text-[#C9D6CC] break-all">
                  {init.digest.slice(0, 32)}…
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#050A07] p-3">
                <div className="text-[#6E8275] uppercase tracking-[0.1em] text-[10px] mb-1">
                  ed25519 Signature
                </div>
                <div className="text-[#C9D6CC] break-all">
                  {init.signature.slice(0, 32)}…
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STAGE 2 — Broadcast with packet flow */}
      <AnimatePresence>
        {init && broadcast && stage >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="rounded-xl border border-white/10 bg-[#08120C] p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Radio className="w-4 h-4 text-[#B8FF2E]" aria-hidden="true" />
              <span className="font-display text-sm font-bold text-[#F4F7F4]">
                Stage 2 · Maritime Mesh Relay
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
              {/* Origin node */}
              <div className="shrink-0 rounded-lg border border-[#B8FF2E]/40 bg-[#B8FF2E]/5 px-3 py-2 text-center">
                <div className="font-mono-tabular text-xs font-bold text-[#F4F7F4]">
                  {init.origin}
                </div>
                <div className="text-[10px] text-[#6E8275] font-mono-tabular">origin</div>
              </div>

              {/* Animated packet channels */}
              {broadcast.peers.map((p, i) => (
                <div key={p.agentId} className="flex-1 min-w-[80px] flex items-center">
                  <div className="relative h-px flex-1 bg-white/10">
                    <motion.span
                      className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#B8FF2E]"
                      initial={{ left: '0%', opacity: 0 }}
                      animate={{ left: ['0%', '96%'], opacity: [0, 1, 1, 0] }}
                      transition={{
                        duration: 0.8,
                        delay: 0.15 + i * 0.25,
                        repeat: 1,
                        ease: 'linear',
                      }}
                    />
                  </div>
                  <ArrowRight className="w-3 h-3 text-[#6E8275] shrink-0" aria-hidden="true" />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.25, duration: 0.3, ease: EASE }}
                    className="shrink-0 rounded-lg border border-white/12 bg-[#050A07] px-3 py-2 text-center"
                  >
                    <div className="font-mono-tabular text-xs font-bold text-[#F4F7F4]">
                      {p.agentId}
                    </div>
                    <div className="text-[10px] text-[#6E8275] font-mono-tabular">
                      {p.relayLatencyMs}ms
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#9FB2A5] mt-4 font-mono-tabular">
              digest {broadcast.digestEchoed} echoed · relay signature verified ✓
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STAGE 3 — Peer verification cards */}
      <AnimatePresence>
        {verdicts && stage >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {verdicts.map((v, i) => (
              <motion.div
                key={v.agentId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.35, duration: 0.4, ease: EASE }}
                className="rounded-xl border border-white/10 bg-[#08120C] p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono-tabular text-sm font-bold text-[#F4F7F4]">
                    Agent {v.agentId}
                  </div>
                  {v.corroborated === true ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono-tabular text-[10px] uppercase border border-[#34D399]/40 bg-[#34D399]/10 text-[#34D399]">
                      <BadgeCheck className="w-3 h-3" aria-hidden="true" />
                      Corroborated
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono-tabular text-[10px] uppercase border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]">
                      <Ban className="w-3 h-3" aria-hidden="true" />
                      Rejected
                    </span>
                  )}
                </div>
                <div className="font-mono-tabular text-2xl font-bold text-[#F4F7F4]">
                  {v.confidence?.toFixed(1) ?? '—'}%
                </div>
                <p className="text-[11px] text-[#9FB2A5] leading-relaxed min-h-[32px]">
                  {v.rationale ?? 'No rationale returned.'}
                </p>
                <div className="flex flex-wrap gap-1.5 font-mono-tabular text-[10px]">
                  <span className="px-1.5 py-0.5 rounded border border-white/10 text-[#6E8275]">
                    {v.mode.replace('prune-', '')}
                  </span>
                  {v.redactions > 0 && (
                    <span className="px-1.5 py-0.5 rounded border border-[#B8FF2E]/30 text-[#B8FF2E]">
                      {v.redactions} redaction{v.redactions > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded border border-white/10 text-[#6E8275]">
                    {v.tokensIn + v.tokensOut} tok
                  </span>
                  <span className="px-1.5 py-0.5 rounded border border-white/10 text-[#6E8275]">
                    ${v.costUsd.toFixed(5)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded border border-white/10 text-[#6E8275]">
                    {v.latencyMs}ms
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* STAGE 4 — Quorum verdict */}
      <AnimatePresence>
        {result && stage >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className={`rounded-xl border p-6 space-y-5 ${
              result.quorum.met
                ? 'border-[#34D399]/40 bg-[#34D399]/[0.06]'
                : 'border-[#F59E0B]/40 bg-[#F59E0B]/[0.06]'
            }`}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2.5">
                {result.quorum.met ? (
                  <ShieldCheck className="w-6 h-6 text-[#34D399]" aria-hidden="true" />
                ) : (
                  <ShieldX className="w-6 h-6 text-[#F59E0B]" aria-hidden="true" />
                )}
                <div>
                  <div
                    className={`font-display text-lg font-bold ${
                      result.quorum.met ? 'text-[#34D399]' : 'text-[#F59E0B]'
                    }`}
                  >
                    {result.verificationStatus}
                  </div>
                  <div className="text-[11px] text-[#9FB2A5] font-mono-tabular">
                    {result.eventId} · quorum {result.quorum.corroborations}/
                    {result.quorum.required}
                  </div>
                </div>
              </div>

              {/* Confidence counter */}
              <div className="text-right">
                <div
                  className={`font-display text-5xl font-black font-mono-tabular ${
                    result.quorum.met ? 'text-[#34D399]' : 'text-[#F59E0B]'
                  }`}
                >
                  <AnimatedConfidence value={result.confidence} />%
                </div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#9FB2A5] font-mono-tabular mt-1">
                  consensus confidence
                </div>
              </div>
            </div>

            {/* Quorum slots */}
            <div className="flex items-center gap-2">
              {Array.from({ length: result.quorum.required }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    borderColor:
                      i < result.quorum.corroborations
                        ? 'rgba(52,211,153,0.6)'
                        : 'rgba(255,255,255,0.12)',
                    backgroundColor:
                      i < result.quorum.corroborations
                        ? 'rgba(52,211,153,0.12)'
                        : 'rgba(255,255,255,0.02)',
                  }}
                  transition={{ delay: 0.3 + i * 0.2, type: 'spring', stiffness: 260, damping: 20 }}
                  className="w-12 h-3 rounded-full border"
                />
              ))}
              <span className="text-[11px] text-[#9FB2A5] font-mono-tabular ml-2">
                {result.quorum.corroborations} of {result.quorum.required} independent
                corroborations required
              </span>
            </div>

            {/* Recommendation + trust recalibration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/10 bg-[#050A07] p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#6E8275] font-mono-tabular mb-1.5">
                  Aegis Policy Directive
                </div>
                <p className="text-xs text-[#C9D6CC] leading-relaxed">
                  {result.recommendation}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#050A07] p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[#6E8275] font-mono-tabular mb-1.5">
                  Trust Weight Recalibration
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.trustDeltas.map((d) => (
                    <motion.span
                      key={d.agentId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className={`px-2 py-0.5 rounded font-mono-tabular text-[10px] border ${
                        d.delta >= 0
                          ? 'border-[#34D399]/30 text-[#34D399]'
                          : 'border-[#F59E0B]/30 text-[#F59E0B]'
                      }`}
                    >
                      {d.agentId} {d.delta >= 0 ? '+' : ''}
                      {d.delta.toFixed(1)}
                      {d.newTrust !== undefined && ` → ${d.newTrust.toFixed(1)}%`}
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-[#6E8275] font-mono-tabular">
              Every verdict above was a real gateway call — PII redaction, policy
              screening, token budget and cost telemetry enforced inline.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

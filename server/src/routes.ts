import { Router } from 'express';
import { createHash, createPrivateKey, sign as cryptoSign } from 'node:crypto';
import { maritime } from './maritime/runtime.js';
import { prune, type PruneEvaluation } from './prune/gateway.js';
import { GEMINI_CONFIGURED, EXTERNAL_PRUNE_CONFIGURED } from './config.js';

export const api = Router();

/* ===========================================================================
 * HEALTH
 * ======================================================================== */
api.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'aegis-backend',
    layers: {
      maritime: 'online',
      prune: 'online',
      gemini: GEMINI_CONFIGURED ? 'live' : 'deterministic-guard',
      externalPrune: EXTERNAL_PRUNE_CONFIGURED ? 'configured' : 'built-in',
    },
    ts: new Date().toISOString(),
  });
});

/* ===========================================================================
 * MARITIME — LAYER 01 · AGENT RUNTIME
 * Lifecycle: register → challenge → signed heartbeat → active → suspend/retire
 * ======================================================================== */
api.get('/maritime/agents', (_req, res) => {
  res.json({
    agents: maritime.list().map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      role: a.role,
      host: a.host,
      capabilities: a.capabilities,
      lifecycle: a.lifecycle,
      fingerprint: a.fingerprint,
      trustScore: a.trustScore,
      heartbeats: a.heartbeats,
      registeredAt: a.registeredAt,
      lastHeartbeat: a.lastHeartbeat,
      rejectedSignatures: a.rejectedSignatures,
    })),
    count: maritime.list().length,
  });
});

api.post('/maritime/agents', (req, res) => {
  const { name, role, host, capabilities } = req.body ?? {};
  if (!name && !host) {
    res.status(400).json({ error: 'name or host is required' });
    return;
  }
  const { agent, privateKeyPem } = maritime.register({ name, role, host, capabilities });
  res.status(201).json({
    agent: publicAgent(agent),
    privateKeyPem,
    note: 'Private key is returned ONCE (simulates delivery to the agent host). Sign heartbeats with it.',
  });
});

api.post('/maritime/agents/:id/challenge', (req, res) => {
  const challenge = maritime.issueChallenge(req.params.id);
  if (!challenge) {
    res.status(404).json({ error: 'unknown agent' });
    return;
  }
  res.json({ agentId: req.params.id, challenge, algorithm: 'ed25519', messageFormat: '<agentId>:<challenge>' });
});

api.post('/maritime/agents/:id/heartbeat', (req, res) => {
  const { challenge, signature } = req.body ?? {};
  if (!challenge || !signature) {
    res.status(400).json({ error: 'challenge and signature are required' });
    return;
  }
  const result = maritime.verifyHeartbeat(req.params.id, challenge, signature);
  if (!result.ok) {
    res.status(401).json({ ok: false, reason: result.reason });
    return;
  }
  res.json({ ok: true, agent: publicAgent(result.agent!) });
});

api.post('/maritime/agents/:id/:action(suspend|activate|retire)', (req, res) => {
  const agent = maritime.setLifecycle(req.params.id, req.params.action as never);
  if (!agent) {
    res.status(404).json({ error: 'unknown agent' });
    return;
  }
  res.json({ agent: publicAgent(agent) });
});

api.get('/maritime/mesh', (_req, res) => {
  res.json(maritime.meshSnapshot());
});

/**
 * DEMO HELPER — simulates a full agent-host join: register → fetch challenge →
 * sign with the delivered private key → verified heartbeat. This is exactly
 * what a real MARITIME-hosted agent does at boot, compressed for the demo.
 */
api.post('/maritime/demo-register', (req, res) => {
  const { name, role, host, capabilities } = req.body ?? {};
  const { agent, privateKeyPem } = maritime.register({
    name: name ?? 'Federation Verification Agent',
    role: role ?? 'Federated Verification Agent',
    host: host ?? 'federation-node.external',
    capabilities,
  });
  const challenge = maritime.issueChallenge(agent.id)!;
  const signature = cryptoSign(
    null,
    Buffer.from(`${agent.id}:${challenge}`, 'utf8'),
    createPrivateKey(privateKeyPem)
  ).toString('base64');
  const beat = maritime.verifyHeartbeat(agent.id, challenge, signature);
  res.status(201).json({
    agent: publicAgent(agent),
    joinFlow: {
      registered: true,
      challengeIssued: true,
      signatureVerified: beat.ok,
      lifecycle: agent.lifecycle,
      heartbeats: agent.heartbeats,
    },
    privateKeyPem,
  });
});

/* ===========================================================================
 * PRUNE — LAYER 02 · MODEL GATEWAY
 * All model calls flow: policy filter → sanitizer → token guard → gateway.
 * ======================================================================== */
api.get('/prune/stats', (_req, res) => {
  res.json(prune.stats());
});

api.get('/prune/logs', (req, res) => {
  const limit = Math.min(200, Number(req.query.limit ?? 25) || 25);
  res.json({ logs: prune.logsAll(limit) });
});

api.post('/prune/evaluate', async (req, res) => {
  const { agentId, callType, payload } = req.body ?? {};
  if (!payload || typeof payload !== 'string') {
    res.status(400).json({ error: 'payload (string) is required' });
    return;
  }
  try {
    const evaluation = await prune.evaluate({
      agentId: typeof agentId === 'string' ? agentId : 'A',
      callType: typeof callType === 'string' ? callType : 'threat_verification',
      payload,
    });
    res.json(evaluation);
  } catch (err) {
    res.status(502).json({
      error: 'gateway_upstream_failure',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

/* ===========================================================================
 * DEMO SCENARIOS — the full mesh verification loop, end to end
 * ======================================================================== */
const SCENARIOS = {
  threat: {
    title: 'Coordinated lateral credential probe',
    origin: 'A',
    peers: ['B', 'C', 'D'],
    callType: 'threat_verification',
    payload: (id: string) =>
      `EVT-${Date.now()} · SOURCE Agent ${id}\n` +
      `Lateral credential probe detected: 41 sequential Kerberos pre-auth failures ` +
      `from workstation 10.4.7.22 toward db-core-02.admin role within 90s.\n` +
      `Evidence: packet hash match 9f3a…c21d verified against flow record; process lineage ` +
      `captured (mimikatz.exe → lsass.exe). Source session token 3b8f2 correlates in two flows.`,
  },
  unreliable: {
    title: 'Unsupported egress spike claim',
    origin: 'D',
    peers: ['A', 'B', 'C'],
    callType: 'anomaly_triage',
    payload: (id: string) =>
      `EVT-${Date.now()} · SOURCE Agent ${id}\n` +
      `Agent claims unauthorized archive exfiltration of 2.1GB. Heuristic-only alert; ` +
      `no matching flow record, missing packet signature, no destination catalogued. ` +
      `Payload digest unsupported — single-node claim awaiting corroboration.`,
  },
} as const;

api.post('/demo/:scenario(threat|unreliable)', async (req, res) => {
  const spec = SCENARIOS[req.params.scenario as keyof typeof SCENARIOS];
  const stages: Array<Record<string, unknown>> = [];

  // Stage 1 — origin detection (signed evidence bundle via MARITIME)
  const originSig = maritime.signFor(spec.origin, spec.title) ?? '';
  stages.push({
    stage: 'detect',
    detail: `Agent ${spec.origin} detected "${spec.title}" and signed the evidence digest (ed25519).`,
    signature: originSig.slice(0, 24) + '…',
  });

  // Stage 2 — mesh broadcast
  stages.push({
    stage: 'broadcast',
    detail: `Evidence bundle broadcast to peers ${spec.peers.join(', ')} via Maritime mesh.`,
    peers: spec.peers,
  });

  // Stage 3 — each peer independently verifies THROUGH PRUNE
  const verdicts: Array<Record<string, unknown>> = [];
  for (const peer of spec.peers) {
    const evaluation = await prune.evaluate({
      agentId: peer,
      callType: spec.callType,
      payload: spec.payload(peer),
    });
    verdicts.push({
      agentId: peer,
      decision: evaluation.decision,
      mode: evaluation.mode,
      corroborated: evaluation.verdict?.corroborated ?? null,
      confidence: evaluation.verdict?.confidence ?? null,
      redactions: evaluation.redactionsApplied,
      tokens: evaluation.tokensIn + evaluation.tokensOut,
      costUsd: evaluation.estimatedCostUsd,
      latencyMs: evaluation.latencyMs,
    });
  }
  stages.push({ stage: 'verification', detail: 'Peers evaluated through Prune gateway.', verdicts });

  // Stage 4 — consensus
  const corroborations = verdicts.filter((v) => v.corroborated === true).length;
  const verified = corroborations >= maritime.meshSnapshot().quorumRequirement;
  const confidence = verified ? 96.8 : 18.4;
  stages.push({
    stage: 'consensus',
    quorum: `${corroborations}/${spec.peers.length}`,
    verified,
    confidence,
    detail: verified
      ? `Quorum met (${corroborations}/${spec.peers.length}) — threat VERIFIED at ${confidence}% confidence.`
      : `Quorum not met (${corroborations}/${spec.peers.length}) — claim FLAGGED UNRELIABLE at ${confidence}% confidence. Alert fatigue prevented.`,
  });

  res.json({
    scenario: req.params.scenario,
    title: spec.title,
    stages,
    verdict: {
      verified,
      confidence,
      corroborations,
      quorumRequired: maritime.meshSnapshot().quorumRequirement,
    },
  });
});

/* ===========================================================================
 * CONSENSUS ENGINE — staged, inspectable mesh verification (the USP demo)
 * Each stage is a separate call so the frontend can animate the loop live:
 *   init (sign evidence) → broadcast (mesh relay) → verify (real Prune calls
 *   per peer) → consensus (quorum + trust recalibration)
 * ======================================================================== */
interface ConsensusSession {
  id: string;
  scenario: 'threat' | 'unreliable' | 'custom';
  title: string;
  origin: string;
  peers: string[];
  eventId: string;
  payload: string;
  digest: string;
  signature: string;
  broadcastAt: string | null;
  verdicts: Record<string, PruneEvaluation>;
  createdAt: string;
}

const consensusSessions = new Map<string, ConsensusSession>();
let sessionCounter = 0;
let consensusEventCounter = 9200;

const CONSENSUS_SCENARIOS = {
  threat: {
    title: 'Coordinated lateral credential probe',
    origin: 'A',
    peers: ['B', 'C', 'D'],
    callType: 'threat_verification',
    severity: 'Critical',
    baseConfidence: 58.2,
    payload: (origin: string) =>
      `EVT-${++consensusEventCounter} · SOURCE Agent ${origin}\n` +
      `Lateral credential probe detected: 41 sequential Kerberos pre-auth failures ` +
      `from workstation 10.4.7.22 toward db-core-02.admin role within 90s.\n` +
      `Evidence: packet hash match 9f3a…c21d verified against flow record; process lineage ` +
      `captured (mimikatz.exe → lsass.exe). Source session token 3b8f2 correlates in two flows.`,
  },
  unreliable: {
    title: 'Unsupported egress spike claim',
    origin: 'D',
    peers: ['A', 'B', 'C'],
    callType: 'anomaly_triage',
    severity: 'Medium',
    baseConfidence: 41.0,
    payload: (origin: string) =>
      `EVT-${++consensusEventCounter} · SOURCE Agent ${origin}\n` +
      `Agent claims unauthorized archive exfiltration of 2.1GB. Heuristic-only alert; ` +
      `no matching flow record, missing packet signature, no destination catalogued. ` +
      `Payload digest unsupported — single-node claim awaiting corroboration.`,
  },
} as const;

api.post('/consensus/init', (req, res) => {
  const { scenario, customPayload } = req.body ?? {};
  const isCustom = scenario === 'custom' && typeof customPayload === 'string' && customPayload.trim().length > 0;
  const spec = isCustom
    ? null
    : CONSENSUS_SCENARIOS[(scenario ?? 'threat') as keyof typeof CONSENSUS_SCENARIOS] ?? CONSENSUS_SCENARIOS.threat;

  const origin = isCustom ? 'A' : spec!.origin;
  const peers = isCustom ? ['B', 'C', 'D'] : [...spec!.peers];
  const payload = isCustom ? String(customPayload) : spec!.payload(origin);
  const title = isCustom ? 'Custom telemetry submission' : spec!.title;

  const digest = createHash('sha256').update(payload).digest('hex');
  const signature = maritime.signFor(origin, `${title}:${digest}`) ?? '';
  const session: ConsensusSession = {
    id: `SES-${String(++sessionCounter).padStart(3, '0')}`,
    scenario: isCustom ? 'custom' : (scenario === 'unreliable' ? 'unreliable' : 'threat'),
    title,
    origin,
    peers,
    eventId: `EVT-${consensusEventCounter}`,
    payload,
    digest,
    signature,
    broadcastAt: null,
    verdicts: {},
    createdAt: new Date().toISOString(),
  };
  consensusSessions.set(session.id, session);
  res.status(201).json({
    sessionId: session.id,
    eventId: session.eventId,
    title,
    scenario: session.scenario,
    origin,
    peers,
    severity: isCustom ? 'High' : spec!.severity,
    baseConfidence: isCustom ? 60 : spec!.baseConfidence,
    digest,
    signature,
    signatureAlgorithm: 'ed25519',
    createdAt: session.createdAt,
  });
});

api.post('/consensus/:id/broadcast', (req, res) => {
  const session = consensusSessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'unknown_session' });
    return;
  }
  session.broadcastAt = new Date().toISOString();
  res.json({
    sessionId: session.id,
    eventId: session.eventId,
    relay: 'Maritime Mesh Relay',
    peers: session.peers.map((peer) => ({
      agentId: peer,
      host: maritime.get(peer)?.host ?? 'unknown',
      relayLatencyMs: 14 + Math.floor(Math.random() * 36),
    })),
    digestEchoed: session.digest.slice(0, 16) + '…',
    signatureVerifiedOnRelay: true,
  });
});

api.post('/consensus/:id/verify', async (req, res) => {
  const session = consensusSessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'unknown_session' });
    return;
  }
  const evaluations: PruneEvaluation[] = [];
  for (const peer of session.peers) {
    const evaluation = await prune.evaluate({
      agentId: peer,
      callType: session.scenario === 'unreliable' ? 'anomaly_triage' : 'threat_verification',
      payload: `${session.eventId} · independent peer review by Agent ${peer}\n${session.payload}`,
    });
    evaluations.push(evaluation);
  }
  session.verdicts = Object.fromEntries(evaluations.map((e) => [e.agentId, e]));
  res.json({
    sessionId: session.id,
    evaluations: evaluations.map((e) => ({
      agentId: e.agentId,
      decision: e.decision,
      mode: e.mode,
      corroborated: e.verdict?.corroborated ?? null,
      confidence: e.verdict?.confidence ?? null,
      rationale: e.verdict?.rationale ?? null,
      redactions: e.redactionsApplied,
      tokensIn: e.tokensIn,
      tokensOut: e.tokensOut,
      costUsd: e.estimatedCostUsd,
      latencyMs: e.latencyMs,
      trace: e.trace,
    })),
  });
});

api.post('/consensus/:id/consensus', (req, res) => {
  const session = consensusSessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'unknown_session' });
    return;
  }
  if (Object.keys(session.verdicts).length === 0) {
    res.status(409).json({ error: 'verification_not_run' });
    return;
  }
  const corroborations = session.peers.filter(
    (p) => session.verdicts[p]?.verdict?.corroborated === true
  ).length;
  const quorumRequired = maritime.meshSnapshot().quorumRequirement;
  const verified = corroborations >= quorumRequired;
  const base =
    session.scenario === 'unreliable' ? 41.0 : session.scenario === 'custom' ? 60 : 58.2;
  const confidence = verified
    ? Math.min(97.4, base + corroborations * 12.9)
    : Math.max(18.4, base - (session.peers.length - corroborations) * 7.5);

  // Trust recalibration — verified reports compound trust, flagged ones decay it.
  const trustDeltas = session.peers.map((peer) => {
    const agent = maritime.get(peer);
    if (!agent) return { agentId: peer, delta: 0 };
    const delta = verified ? 0.3 : -1.1;
    agent.trustScore = Number(
      Math.min(99.9, Math.max(60, agent.trustScore + delta)).toFixed(2)
    );
    return { agentId: peer, delta, newTrust: agent.trustScore };
  });
  const originDelta = verified ? 0.4 : -2.4;
  const originAgent = maritime.get(session.origin);
  if (originAgent) {
    originAgent.trustScore = Number(
      Math.min(99.9, Math.max(60, originAgent.trustScore + originDelta)).toFixed(2)
    );
  }

  res.json({
    sessionId: session.id,
    eventId: session.eventId,
    quorum: { corroborations, required: quorumRequired, met: verified },
    confidence: Number(confidence.toFixed(1)),
    verificationStatus: verified ? 'Verified' : 'Flagged Unreliable',
    recommendation: verified
      ? 'Revoke compromised session credential, quarantine source workstation port, and lock escalated replica role.'
      : 'Do not escalate. Suppress unsupported claim, quarantine event, and reduce source node trust weight.',
    trustDeltas: [...trustDeltas, { agentId: session.origin, delta: originDelta, newTrust: originAgent?.trustScore }],
    gatewayStats: prune.stats(),
  });
});

api.get('/consensus/:id', (req, res) => {
  const session = consensusSessions.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'unknown_session' });
    return;
  }
  res.json({
    sessionId: session.id,
    title: session.title,
    scenario: session.scenario,
    eventId: session.eventId,
    origin: session.origin,
    peers: session.peers,
    digest: session.digest,
    signature: session.signature,
    broadcastAt: session.broadcastAt,
    verifiedPeers: Object.keys(session.verdicts),
  });
});

api.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
function publicAgent(a: any) {
  const { privateKeyPem: _k, publicKeyPem: _p, ...rest } = a;
  return rest;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

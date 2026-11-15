/**
 * Typed API client for the Aegis backend (MARITIME + PRUNE).
 * All calls degrade gracefully — the dashboard stays fully functional in
 * simulation mode when the backend is offline.
 */

export const API_BASE: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

export interface HealthResponse {
  status: string;
  service: string;
  layers: {
    maritime: string;
    prune: string;
    gemini: string;
    externalPrune: string;
  };
  ts: string;
}

export interface PruneStats {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  redactionsTotal: number;
  tokensTotal: number;
  estimatedCostUsd: number;
  spendCeilingUsd: number;
  spendRemainingUsd: number;
  geminiConfigured: boolean;
  externalPruneConfigured: boolean;
}

export interface PruneCallLog {
  id: string;
  ts: string;
  agentId: string;
  callType: string;
  decision: 'allowed' | 'blocked';
  reason?: string;
  redactions: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  mode: string;
}

export interface PruneTraceStage {
  stage: 'policy_filter' | 'sanitizer' | 'token_guard' | 'model_gateway';
  verdict: 'pass' | 'modified' | 'blocked';
  detail: string;
}

export interface PruneEvaluationResponse {
  agentId: string;
  callType: string;
  decision: 'allowed' | 'blocked';
  blockReason?: string;
  policyViolations: string[];
  sanitizedPayload: string;
  redactionsApplied: number;
  redactionSamples: Array<{ type: string; replacement: string }>;
  tokensIn: number;
  tokensOut: number;
  estimatedCostUsd: number;
  latencyMs: number;
  mode: 'prune-proxy' | 'prune-local-gemini' | 'prune-deterministic-guard';
  trace: PruneTraceStage[];
  verdict: {
    corroborated: boolean;
    confidence: number;
    rationale: string;
    recommendation: string;
  } | null;
}

export interface MaritimeAgentSummary {
  id: string;
  code: string;
  name: string;
  role: string;
  host: string;
  capabilities: string[];
  lifecycle: 'registered' | 'active' | 'suspended' | 'retired';
  fingerprint: string;
  trustScore: number;
  heartbeats: number;
  registeredAt: string;
  lastHeartbeat: string | null;
  rejectedSignatures: number;
}

export interface MaritimeJoinResult {
  agent: MaritimeAgentSummary;
  joinFlow: {
    registered: boolean;
    challengeIssued: boolean;
    signatureVerified: boolean;
    lifecycle: string;
    heartbeats: number;
  };
  privateKeyPem: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`API ${res.status} on ${path}: ${detail.slice(0, 160)}`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<HealthResponse>('/health'),

  pruneStats: () => request<PruneStats>('/prune/stats'),

  pruneLogs: (limit = 25) =>
    request<{ logs: PruneCallLog[] }>(`/prune/logs?limit=${limit}`),

  evaluate: (body: { agentId: string; callType: string; payload: string }) =>
    request<PruneEvaluationResponse>('/prune/evaluate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  maritimeAgents: () =>
    request<{ agents: MaritimeAgentSummary[]; count: number }>(
      '/maritime/agents'
    ),

  maritimeMesh: () => request<Record<string, unknown>>('/maritime/mesh'),

  maritimeDemoRegister: (body?: {
    name?: string;
    role?: string;
    host?: string;
  }) =>
    request<MaritimeJoinResult>('/maritime/demo-register', {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),
};

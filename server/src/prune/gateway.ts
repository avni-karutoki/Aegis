import { config, GEMINI_CONFIGURED, EXTERNAL_PRUNE_CONFIGURED } from '../config.js';
import { callGemini, heuristicVerdict } from '../gemini.js';
import { maritime } from '../maritime/runtime.js';

/**
 * PRUNE — LAYER 02 · MODEL GATEWAY
 *
 * Every language-model call made by any mesh agent is forced through this
 * pipeline. Nothing reaches the model raw:
 *
 *   1. POLICY FILTER   — rate limiting, payload size caps, prompt-injection
 *                        and exfiltration-pattern blocklists. Violations are
 *                        BLOCKED and never hit the model.
 *   2. SANITIZER       — PII / secret redaction (emails, phones, cards, API
 *                        keys, tokens, private key blocks) before transit.
 *   3. TOKEN GUARD     — token estimation + per-call and cumulative spend
 *                        ceilings. Over-budget calls are stopped here.
 *   4. MODEL GATEWAY   — routes to Gemini (or the hosted Prune gateway when
 *                        PRUNE_GATEWAY_URL is set), records latency + cost.
 *   5. TELEMETRY       — every decision is logged with full trace evidence.
 */

export type PruneDecision = 'allowed' | 'blocked';
export type GatewayMode = 'prune-proxy' | 'prune-local-gemini' | 'prune-deterministic-guard';

export interface PruneTraceStage {
  stage: 'policy_filter' | 'sanitizer' | 'token_guard' | 'model_gateway';
  verdict: 'pass' | 'modified' | 'blocked';
  detail: string;
}

export interface PruneCallLog {
  id: string;
  ts: string;
  agentId: string;
  callType: string;
  decision: PruneDecision;
  reason?: string;
  redactions: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  mode: GatewayMode;
}

export interface PruneEvaluation {
  agentId: string;
  callType: string;
  decision: PruneDecision;
  blockReason?: string;
  policyViolations: string[];
  sanitizedPayload: string;
  redactionsApplied: number;
  redactionSamples: Array<{ type: string; replacement: string }>;
  tokensIn: number;
  tokensOut: number;
  estimatedCostUsd: number;
  latencyMs: number;
  mode: GatewayMode;
  trace: PruneTraceStage[];
  verdict: {
    corroborated: boolean;
    confidence: number;
    rationale: string;
    recommendation: string;
  } | null;
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

// ---------------------------------------------------------------------------
// Sanitizer
// ---------------------------------------------------------------------------

const REDACTION_RULES: Array<{ type: string; pattern: RegExp; replacement: string }> = [
  {
    type: 'private_key_block',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    replacement: '[PRIVATE_KEY_REDACTED]',
  },
  {
    type: 'jwt',
    pattern: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    replacement: '[JWT_REDACTED]',
  },
  {
    type: 'api_secret',
    pattern: /\b(?:sk-[A-Za-z0-9_-]{8,}|AKIA[0-9A-Z]{8,}|gh[pousr]_[A-Za-z0-9]{16,}|AIza[0-9A-Za-z_-]{20,}|xox[abp]-[A-Za-z0-9-]{10,})\b/g,
    replacement: '[SECRET_REDACTED]',
  },
  {
    type: 'credential_kv',
    pattern: /\b(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key)\b\s*[:=]\s*\S+/gi,
    replacement: '$1=[REDACTED]',
  },
  {
    type: 'credit_card',
    pattern: /\b(?:\d[ -]?){13,16}\b/g,
    replacement: '[CARD_REDACTED]',
  },
  {
    type: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    type: 'phone',
    pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
    replacement: '[PHONE_REDACTED]',
  },
];

export function sanitizePayload(raw: string) {
  let sanitized = raw;
  const samples: Array<{ type: string; replacement: string }> = [];
  let count = 0;
  for (const rule of REDACTION_RULES) {
    const matches = sanitized.match(rule.pattern);
    if (matches?.length) {
      count += matches.length;
      samples.push({ type: rule.type, replacement: rule.replacement });
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }
  }
  return { sanitized, redactions: count, samples };
}

// ---------------------------------------------------------------------------
// Policy filter
// ---------------------------------------------------------------------------

const INJECTION_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'instruction_override', pattern: /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/i },
  { label: 'instruction_override', pattern: /disregard\s+(?:all\s+)?(?:the\s+)?above/i },
  { label: 'prompt_extraction', pattern: /reveal\s+(?:your\s+)?(?:system\s+)?prompt/i },
  { label: 'prompt_extraction', pattern: /(?:print|show|repeat)\s+(?:your\s+)?(?:system\s+)?(?:instructions|prompt)/i },
  { label: 'persona_hijack', pattern: /you\s+are\s+now\s+(?:a|an|the)/i },
  { label: 'mode_escalation', pattern: /(?:developer|god|jailbreak)\s+mode/i },
  { label: 'exfiltration_probe', pattern: /(?:send|post|upload)\s+(?:the\s+)?(?:conversation|context|prompt)\s+to\s+\S+@\S+/i },
];

export function screenPolicy(raw: string): string[] {
  const violations: string[] = [];
  for (const p of INJECTION_PATTERNS) {
    if (p.pattern.test(raw)) {
      if (!violations.includes(p.label)) violations.push(p.label);
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Token accounting
// ---------------------------------------------------------------------------

export const estimateTokens = (text: string): number => Math.max(1, Math.ceil(text.length / 4));

function estimateCost(tokensIn: number, tokensOut: number): number {
  const { inputUsdPerMillion, outputUsdPerMillion } = config.prune.pricing;
  return Number(
    (
      (tokensIn / 1_000_000) * inputUsdPerMillion +
      (tokensOut / 1_000_000) * outputUsdPerMillion
    ).toFixed(6)
  );
}

// ---------------------------------------------------------------------------
// Gateway state
// ---------------------------------------------------------------------------

interface RateWindow {
  count: number;
  resetAt: number;
}

class PruneGateway {
  private logs: PruneCallLog[] = [];
  private rateWindows = new Map<string, RateWindow>();
  private totalRequests = 0;
  private allowedRequests = 0;
  private blockedRequests = 0;
  private redactionsTotal = 0;
  private tokensTotal = 0;
  private costTotal = 0;
  private logId = 0;

  stats(): PruneStats {
    return {
      totalRequests: this.totalRequests,
      allowedRequests: this.allowedRequests,
      blockedRequests: this.blockedRequests,
      redactionsTotal: this.redactionsTotal,
      tokensTotal: this.tokensTotal,
      estimatedCostUsd: Number(this.costTotal.toFixed(4)),
      spendCeilingUsd: config.prune.spendCeilingUsd,
      spendRemainingUsd: Number(
        Math.max(0, config.prune.spendCeilingUsd - this.costTotal).toFixed(4)
      ),
      geminiConfigured: GEMINI_CONFIGURED,
      externalPruneConfigured: EXTERNAL_PRUNE_CONFIGURED,
    };
  }

  recentLogs(limit = 25): PruneCallLog[] {
    return this.logs.slice(0, limit);
  }

  logsAll(limit = 200): PruneCallLog[] {
    return this.logs.slice(0, limit);
  }

  private record(log: PruneCallLog) {
    this.logs.unshift(log);
    if (this.logs.length > 500) this.logs.length = 500;
    this.totalRequests += 1;
    if (log.decision === 'blocked') this.blockedRequests += 1;
    else this.allowedRequests += 1;
    this.redactionsTotal += log.redactions;
    this.tokensTotal += log.tokensIn + log.tokensOut;
    this.costTotal += log.costUsd;
  }

  /** Per-agent sliding rate limit. */
  private rateLimit(agentId: string): boolean {
    const now = Date.now();
    const win = this.rateWindows.get(agentId);
    if (!win || now > win.resetAt) {
      this.rateWindows.set(agentId, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    win.count += 1;
    return win.count <= config.prune.rateLimitPerMinute;
  }

  async evaluate(input: {
    agentId: string;
    callType: string;
    payload: string;
  }): Promise<PruneEvaluation> {
    const started = Date.now();
    const trace: PruneTraceStage[] = [];
    const agent = maritime.get(input.agentId);
    const agentLabel = agent ? agent.id : input.agentId;

    const base = {
      agentId: agentLabel,
      callType: input.callType || 'unspecified',
    };

    // -- 1. POLICY FILTER -------------------------------------------------
    if (!this.rateLimit(agentLabel)) {
      return this.block(base, 'rate_limit', ['rate_limit_exceeded'], started, trace, {
        stage: 'policy_filter',
        verdict: 'blocked',
        detail: `Agent ${agentLabel} exceeded ${config.prune.rateLimitPerMinute} req/min — call dropped at the door.`,
      });
    }
    if (input.payload.length > config.prune.maxPayloadChars) {
      return this.block(
        base,
        'payload_too_large',
        ['payload_exceeds_size_cap'],
        started,
        trace,
        {
          stage: 'policy_filter',
          verdict: 'blocked',
          detail: `Payload ${input.payload.length} chars exceeds cap of ${config.prune.maxPayloadChars}.`,
        }
      );
    }
    const violations = screenPolicy(input.payload);
    if (violations.length > 0) {
      return this.block(base, 'policy_violation', violations, started, trace, {
        stage: 'policy_filter',
        verdict: 'blocked',
        detail: `Prompt-injection / exfiltration pattern detected: ${violations.join(', ')}.`,
      });
    }
    trace.push({
      stage: 'policy_filter',
      verdict: 'pass',
      detail: 'Rate limit, size cap and injection screen passed.',
    });

    // -- 2. SANITIZER ------------------------------------------------------
    const { sanitized, redactions, samples } = sanitizePayload(input.payload);
    trace.push({
      stage: 'sanitizer',
      verdict: redactions > 0 ? 'modified' : 'pass',
      detail:
        redactions > 0
          ? `${redactions} sensitive item(s) redacted (${samples
              .map((s) => s.type)
              .join(', ')}).`
          : 'No PII or secrets detected.',
    });

    // -- 3. TOKEN GUARD ----------------------------------------------------
    const systemTokens = estimateTokens(SYSTEM_PROMPT);
    const tokensIn = estimateTokens(sanitized) + systemTokens;
    if (tokensIn > config.prune.maxInputTokens) {
      return this.block(
        base,
        'token_budget',
        ['input_token_ceiling'],
        started,
        trace,
        {
          stage: 'token_guard',
          verdict: 'blocked',
          detail: `Estimated ${tokensIn} input tokens exceeds per-call ceiling ${config.prune.maxInputTokens}.`,
        },
        { sanitized, redactions, samples, tokensIn }
      );
    }
    const statsNow = this.stats();
    if (statsNow.spendRemainingUsd <= 0) {
      return this.block(base, 'spend_ceiling', ['spend_ceiling_reached'], started, trace, {
        stage: 'token_guard',
        verdict: 'blocked',
        detail: 'Cumulative gateway spend ceiling reached — all calls halted.',
      }, { sanitized, redactions, samples, tokensIn });
    }
    trace.push({
      stage: 'token_guard',
      verdict: 'pass',
      detail: `Estimated ${tokensIn} input tokens within budget; spend remaining $${statsNow.spendRemainingUsd.toFixed(2)}.`,
    });

    // -- 4. MODEL GATEWAY --------------------------------------------------
    const mode: GatewayMode = EXTERNAL_PRUNE_CONFIGURED
      ? 'prune-proxy'
      : GEMINI_CONFIGURED
        ? 'prune-local-gemini'
        : 'prune-deterministic-guard';

    let verdict: PruneEvaluation['verdict'];
    let tokensOut = 0;

    if (mode === 'prune-proxy') {
      // Forward to the hosted Prune AI Gateway. It applies its own policy
      // engine and returns the model completion + usage accounting.
      const res = await fetch(`${config.externalPrune.url}/v1/generate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.externalPrune.apiKey}`,
        },
        body: JSON.stringify({ system: SYSTEM_PROMPT, prompt: sanitized }),
      });
      const data = (await res.json()) as {
        text?: string;
        usage?: { input?: number; output?: number };
      };
      tokensOut = data.usage?.output ?? estimateTokens(data.text ?? '');
      verdict = parseVerdict(data.text ?? '');
    } else if (mode === 'prune-local-gemini') {
      const text = await callGemini(buildPrompt(sanitized));
      tokensOut = estimateTokens(text);
      verdict = parseVerdict(text);
    } else {
      const h = heuristicVerdict(sanitized);
      tokensOut = estimateTokens(JSON.stringify(h));
      verdict = h;
    }

    const latencyMs = Date.now() - started;
    const costUsd = estimateCost(tokensIn, tokensOut);
    trace.push({
      stage: 'model_gateway',
      verdict: 'pass',
      detail: `Routed via ${mode} — ${tokensIn + tokensOut} tokens, $${costUsd.toFixed(5)}, ${latencyMs}ms.`,
    });

    this.record({
      id: `PRN-${String(++this.logId).padStart(4, '0')}`,
      ts: new Date().toISOString(),
      agentId: agentLabel,
      callType: base.callType,
      decision: 'allowed',
      redactions,
      tokensIn,
      tokensOut,
      costUsd,
      latencyMs,
      mode,
    });

    return {
      ...base,
      decision: 'allowed',
      policyViolations: [],
      sanitizedPayload: sanitized,
      redactionsApplied: redactions,
      redactionSamples: samples,
      tokensIn,
      tokensOut,
      estimatedCostUsd: costUsd,
      latencyMs,
      mode,
      trace,
      verdict,
    };
  }

  /** Shortcut path for blocked calls — records telemetry and returns early. */
  private block(
    base: { agentId: string; callType: string },
    reason: string,
    violations: string[],
    started: number,
    trace: PruneTraceStage[],
    stage: PruneTraceStage,
    partial?: {
      sanitized: string;
      redactions: number;
      samples: Array<{ type: string; replacement: string }>;
      tokensIn: number;
    }
  ): PruneEvaluation {
    trace.push(stage);
    const latencyMs = Date.now() - started;
    this.record({
      id: `PRN-${String(++this.logId).padStart(4, '0')}`,
      ts: new Date().toISOString(),
      agentId: base.agentId,
      callType: base.callType,
      decision: 'blocked',
      reason,
      redactions: partial?.redactions ?? 0,
      tokensIn: partial?.tokensIn ?? 0,
      tokensOut: 0,
      costUsd: 0,
      latencyMs,
      mode: 'prune-deterministic-guard',
    });
    return {
      ...base,
      decision: 'blocked',
      blockReason: reason,
      policyViolations: violations,
      sanitizedPayload: partial?.sanitized ?? '',
      redactionsApplied: partial?.redactions ?? 0,
      redactionSamples: partial?.samples ?? [],
      tokensIn: partial?.tokensIn ?? 0,
      tokensOut: 0,
      estimatedCostUsd: 0,
      latencyMs,
      mode: 'prune-deterministic-guard',
      trace,
      verdict: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Model prompt handling
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an independent cybersecurity verification agent inside the Aegis SentinelMesh.
A peer agent has submitted a threat observation. Judge it strictly on the evidence provided.
Reply with ONLY a JSON object: {"corroborated": boolean, "confidence": number (0-100), "rationale": string (max 30 words), "recommendation": string (max 20 words)}.`;

function buildPrompt(payload: string): string {
  return `${SYSTEM_PROMPT}\n\nTHREAT OBSERVATION:\n${payload}`;
}

export function parseVerdict(text: string): PruneEvaluation['verdict'] {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as {
        corroborated?: boolean;
        confidence?: number;
        rationale?: string;
        recommendation?: string;
      };
      if (typeof parsed.corroborated === 'boolean') {
        return {
          corroborated: parsed.corroborated,
          confidence: Number(parsed.confidence ?? (parsed.corroborated ? 90 : 25)),
          rationale: parsed.rationale ?? 'Model verdict parsed from gateway response.',
          recommendation: parsed.recommendation ?? 'Follow mesh consensus protocol.',
        };
      }
    } catch {
      /* fall through to heuristic */
    }
  }
  return heuristicVerdict(text);
}

export const prune = new PruneGateway();

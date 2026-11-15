import { config } from './config.js';

export interface Verdict {
  corroborated: boolean;
  confidence: number;
  rationale: string;
  recommendation: string;
}

/** Calls Gemini via REST. Returns raw text; caller parses the verdict JSON. */
export async function callGemini(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}

/**
 * Deterministic verification used when no Gemini key is configured.
 * It grades the observation on evidence completeness markers so the whole
 * demo remains functional (and offline-safe) without any API key.
 */
export function heuristicVerdict(payload: string): Verdict {
  const p = payload.toLowerCase();

  const strongEvidence = [
    'hash match',
    'packet hash',
    'digest',
    'signature',
    'flow record',
    'connection table',
    'correlat',
  ];
  const weakEvidence = ['unverified', 'no matching', 'missing', 'unsupported', 'heuristic', 'claim'];

  const strongHits = strongEvidence.filter((k) => p.includes(k)).length;
  const weakHits = weakEvidence.filter((k) => p.includes(k)).length;

  const corroborated = strongHits >= 1 && weakHits === 0;
  const confidence = corroborated
    ? Math.min(97, 78 + strongHits * 6)
    : Math.max(12, 34 - weakHits * 7 + strongHits * 3);

  return {
    corroborated,
    confidence: Number(confidence.toFixed(1)),
    rationale: corroborated
      ? `Independent markers present (${strongHits} strong evidence signals, 0 contradictions).`
      : `Weak or contradictory evidence (${weakHits} missing/unsupported markers, ${strongHits} corroborating).`,
    recommendation: corroborated
      ? 'Escalate to containment: quarantine source session.'
      : 'Do not escalate; suppress alert and recalibrate source weight.',
  };
}

import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 8787),
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
  },
  externalPrune: {
    url: process.env.PRUNE_GATEWAY_URL ?? '',
    apiKey: process.env.PRUNE_API_KEY ?? '',
  },
  externalMaritime: {
    url: process.env.MARITIME_API_URL ?? '',
    apiKey: process.env.MARITIME_API_KEY ?? '',
  },
  prune: {
    /** Max raw payload characters accepted at the door. */
    maxPayloadChars: 20_000,
    /** Max estimated input tokens allowed per model call. */
    maxInputTokens: 4_000,
    /** Cumulative spend ceiling for the whole gateway (USD). */
    spendCeilingUsd: 50,
    /** Requests per minute allowed per agent identity. */
    rateLimitPerMinute: 30,
    /** gemini-2.0-flash list pricing, USD per 1M tokens. */
    pricing: { inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.4 },
  },
};

export const GEMINI_CONFIGURED = config.gemini.apiKey.length > 0;
export const EXTERNAL_PRUNE_CONFIGURED = config.externalPrune.url.length > 0;
export const EXTERNAL_MARITIME_CONFIGURED = config.externalMaritime.url.length > 0;

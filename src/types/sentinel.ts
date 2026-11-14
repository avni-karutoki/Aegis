export type AgentId = 'A' | 'B' | 'C' | 'D';

export type AgentStatus = 'Active' | 'Verifying' | 'Alert' | 'Caution';

export type EventSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export type VerificationStatus =
  | 'Verified'
  | 'Verifying'
  | 'Flagged Unreliable'
  | 'Pending';

export type ScenarioId =
  | 'coordinated_intrusion'
  | 'unreliable_report'
  | 'multi_vector_exfiltration';

export type SimulationScenario = 'idle' | 'threat' | 'unreliable';

export type SimulationStep =
  | 'idle'
  | 'detecting'
  | 'sharing'
  | 'verifying'
  | 'resolved';

export interface AgentNodeData {
  id: AgentId;
  code: string;
  name: string;
  role: string;
  host: string;
  status: AgentStatus;
  trustScore: number;
  historicalAccuracy: number;
  evidenceCompleteness: number;
  corroborationRate: number;
  consistencyScore: number;
  reportsSubmitted: number;
  lastActive: string;
  currentActivity: string;
  position3D: [number, number, number];
}

export interface ThreatEvent {
  id: string;
  title: string;
  category: string;
  sourceAgentId: AgentId;
  sourceName: string;
  corroboratedBy: AgentId[];
  timestamp: string;
  severity: EventSeverity;
  confidence: number;
  verificationStatus: VerificationStatus;
  summary: string;
  recommendation: string;
}

export interface TimelineEntry {
  id: string;
  eventId: string;
  stage:
    | 'Event detected'
    | 'Intelligence shared'
    | 'Verification started'
    | 'Confidence updated'
    | 'Recommendation generated';
  agentLabel: string;
  timestamp: string;
  detail: string;
  outcome: 'nominal' | 'warning' | 'verified' | 'flagged';
}

export interface AIUsagePoint {
  window: string;
  requests: number;
  blocked: number;
  costUsd: number;
}

export interface TrustDistributionPoint {
  band: string;
  agents: number;
  confidenceAvg: number;
}

export interface DemoScenarioSpec {
  id: ScenarioId;
  title: string;
  subtitle: string;
  originAgentId: AgentId;
  peerAgentIds: AgentId[];
  eventTitle: string;
  category: string;
  severity: EventSeverity;
  rawTelemetryPayload: string;
  expectedOutcome: 'Verified' | 'Flagged Unreliable';
}

export interface PruneEvaluationResult {
  agentId: AgentId;
  corroborated: boolean;
  confidenceDelta: number;
  rationale: string;
  sanitizedPromptPreview: string;
  redactionsApplied: number;
  gatewayMode: 'prune-proxy' | 'prune-local-gemini' | 'prune-deterministic-guard';
  latencyMs: number;
  tokensUsed: number;
  estimatedCostUsd: number;
}

export interface PruneGatewayMetrics {
  totalRequests: number;
  blockedRequests: number;
  redactionsTotal: number;
  estimatedCostUsd: number;
  geminiConfigured: boolean;
  externalPruneConfigured: boolean;
}

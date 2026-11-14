import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  INITIAL_AGENTS,
  INITIAL_AI_USAGE,
  INITIAL_EVENTS,
  INITIAL_TIMELINE,
} from '../data/mockData';
import {
  AIUsagePoint,
  AgentId,
  AgentNodeData,
  SimulationScenario,
  SimulationStep,
  ThreatEvent,
  TimelineEntry,
} from '../types/sentinel';

interface SimulationContextValue {
  agents: AgentNodeData[];
  events: ThreatEvent[];
  timeline: TimelineEntry[];
  aiUsage: AIUsagePoint[];
  selectedAgentId: AgentId;
  setSelectedAgentId: (id: AgentId) => void;
  hoveredAgentId: AgentId | null;
  setHoveredAgentId: (id: AgentId | null) => void;
  scenario: SimulationScenario;
  step: SimulationStep;
  statusMessage: string;
  activePacketPaths: [AgentId, AgentId][];
  averageNetworkTrust: number;
  verifiedThreatCount: number;
  pendingCount: number;
  totalAiRequests: number;
  blockedAiRequests: number;
  illustrativeCostUsd: number;
  simulateThreat: () => void;
  simulateUnreliableReport: () => void;
  resetSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

function formatUtcNow(): string {
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [agents, setAgents] = useState<AgentNodeData[]>(INITIAL_AGENTS);
  const [events, setEvents] = useState<ThreatEvent[]>(INITIAL_EVENTS);
  const [timeline, setTimeline] = useState<TimelineEntry[]>(INITIAL_TIMELINE);
  const [aiUsage, setAiUsage] = useState<AIUsagePoint[]>(INITIAL_AI_USAGE);
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>('A');
  const [hoveredAgentId, setHoveredAgentId] = useState<AgentId | null>(null);
  const [scenario, setScenario] = useState<SimulationScenario>('idle');
  const [step, setStep] = useState<SimulationStep>('idle');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Mesh nominal. Four independent agents monitoring internal infrastructure.'
  );
  const [activePacketPaths, setActivePacketPaths] = useState<[AgentId, AgentId][]>(
    []
  );

  const timersRef = useRef<number[]>([]);
  const eventCounterRef = useRef<number>(9043);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const simulateThreat = useCallback(() => {
    clearTimers();
    const newId = `EVT-${eventCounterRef.current++}`;
    const ts = formatUtcNow();

    setScenario('threat');
    setStep('detecting');
    setSelectedAgentId('A');
    setActivePacketPaths([]);
    setStatusMessage(
      `Stage 1/4: Agent A detected anomalous credential escalation (${newId}).`
    );

    setAgents((prev) =>
      prev.map((a) =>
        a.id === 'A'
          ? {
              ...a,
              status: 'Alert',
              reportsSubmitted: a.reportsSubmitted + 1,
              lastActive: 'Just now',
              currentActivity: `Flagged lateral privilege probe (${newId}) — packaging signed digest`,
            }
          : { ...a, status: 'Active' }
      )
    );

    const pendingEvent: ThreatEvent = {
      id: newId,
      title: 'Coordinated lateral credential probe',
      category: 'Active Threat Simulation',
      sourceAgentId: 'A',
      sourceName: 'Agent A — Office Server',
      corroboratedBy: [],
      timestamp: ts,
      severity: 'Critical',
      confidence: 58.2,
      verificationStatus: 'Verifying',
      summary:
        'Synthetic workstation escalation attempt targeting database admin role and internal API keys.',
      recommendation: 'Awaiting independent peer verification across mesh.',
    };

    setEvents((prev) => [pendingEvent, ...prev]);

    setTimeline((prev) => [
      {
        id: `TL-${Date.now()}-1`,
        eventId: newId,
        stage: 'Event detected',
        agentLabel: 'Agent A — Office Server',
        timestamp: ts,
        detail: `Captured anomalous privilege escalation attempt (${newId}).`,
        outcome: 'warning',
      },
      ...prev,
    ]);

    // Stage 2: Sharing intelligence to B, C, D
    const t1 = window.setTimeout(() => {
      setStep('sharing');
      setActivePacketPaths([
        ['A', 'B'],
        ['A', 'C'],
        ['A', 'D'],
      ]);
      setStatusMessage(
        `Stage 2/4: Agent A broadcasting signed evidence digest to Agents B, C, and D.`
      );

      setTimeline((prev) => [
        {
          id: `TL-${Date.now()}-2`,
          eventId: newId,
          stage: 'Intelligence shared',
          agentLabel: 'Maritime Mesh Relay',
          timestamp: formatUtcNow(),
          detail: 'Dispatched cryptographic evidence bundle from Agent A to peers B, C, D.',
          outcome: 'nominal',
        },
        ...prev,
      ]);
    }, 900);

    // Stage 3: Independent Verification by B, C, D
    const t2 = window.setTimeout(() => {
      setStep('verifying');
      setActivePacketPaths([
        ['B', 'A'],
        ['C', 'A'],
        ['D', 'A'],
        ['B', 'C'],
      ]);
      setStatusMessage(
        `Stage 3/4: Agents B, C, and D independently evaluating packet hashes and query logs.`
      );

      setAgents((prev) =>
        prev.map((a) =>
          a.id === 'A'
            ? a
            : {
                ...a,
                status: 'Verifying',
                lastActive: 'Just now',
                currentActivity: `Independently cross-checking ${newId} against local telemetry`,
              }
        )
      );

      setAiUsage((prev) => [
        ...prev.slice(1),
        {
          window: formatUtcNow().slice(0, 5),
          requests: 298,
          blocked: 7,
          costUsd: 0.86,
        },
      ]);

      setTimeline((prev) => [
        {
          id: `TL-${Date.now()}-3`,
          eventId: newId,
          stage: 'Verification started',
          agentLabel: 'Agents B, C & D',
          timestamp: formatUtcNow(),
          detail: 'Independent log correlation initiated across Database, App, and Backup servers.',
          outcome: 'nominal',
        },
        ...prev,
      ]);
    }, 1900);

    // Stage 4: Consensus Reached & Recommendation Generated
    const t3 = window.setTimeout(() => {
      const doneTs = formatUtcNow();
      setStep('resolved');
      setActivePacketPaths([]);
      setStatusMessage(
        `Stage 4/4: Consensus verified (${newId}) — Threat confidence 96.8%. Containment recommendation issued.`
      );

      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          status: 'Active',
          trustScore: Number(Math.min(99.2, a.trustScore + 0.3).toFixed(1)),
          lastActive: 'Just now',
          currentActivity:
            a.id === 'A'
              ? `Confirmed ${newId} with 3/3 peer corroboration`
              : `Corroborated ${newId} evidence digest — nominal watch resumed`,
        }))
      );

      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === newId
            ? {
                ...ev,
                corroboratedBy: ['B', 'C', 'D'],
                confidence: 96.8,
                verificationStatus: 'Verified',
                recommendation:
                  'Revoke compromised session credential, quarantine workstation port, and lock replica role.',
              }
            : ev
        )
      );

      setTimeline((prev) => [
        {
          id: `TL-${Date.now()}-5`,
          eventId: newId,
          stage: 'Recommendation generated',
          agentLabel: 'Aegis Policy',
          timestamp: doneTs,
          detail: 'High-confidence containment directive issued after 4/4 quorum verification.',
          outcome: 'verified',
        },
        {
          id: `TL-${Date.now()}-4`,
          eventId: newId,
          stage: 'Confidence updated',
          agentLabel: 'Quorum 4/4',
          timestamp: doneTs,
          detail: `Confidence elevated from 58.2% to 96.8% across independent corroborators.`,
          outcome: 'verified',
        },
        ...prev,
      ]);
    }, 3100);

    timersRef.current.push(t1, t2, t3);
  }, [clearTimers]);

  const simulateUnreliableReport = useCallback(() => {
    clearTimers();
    const newId = `EVT-${eventCounterRef.current++}`;
    const ts = formatUtcNow();

    setScenario('unreliable');
    setStep('detecting');
    setSelectedAgentId('D');
    setActivePacketPaths([]);
    setStatusMessage(
      `Stage 1/4: Agent D submitted an uncorroborated anomaly claim (${newId}).`
    );

    setAgents((prev) =>
      prev.map((a) =>
        a.id === 'D'
          ? {
              ...a,
              status: 'Caution',
              reportsSubmitted: a.reportsSubmitted + 1,
              lastActive: 'Just now',
              currentActivity: `Submitted unsupported egress claim (${newId}) — awaiting verification`,
            }
          : { ...a, status: 'Active' }
      )
    );

    const suspectEvent: ThreatEvent = {
      id: newId,
      title: 'Unsupported egress spike claim',
      category: 'Unreliable Report Simulation',
      sourceAgentId: 'D',
      sourceName: 'Agent D — Backup Server',
      corroboratedBy: [],
      timestamp: ts,
      severity: 'Medium',
      confidence: 41.0,
      verificationStatus: 'Verifying',
      summary:
        'Single-node report claiming unauthorized archive exfiltration without packet signature or matching flow hash.',
      recommendation: 'Cross-checking claim with peer agents before any action.',
    };

    setEvents((prev) => [suspectEvent, ...prev]);

    setTimeline((prev) => [
      {
        id: `TL-${Date.now()}-u1`,
        eventId: newId,
        stage: 'Event detected',
        agentLabel: 'Agent D — Backup Server',
        timestamp: ts,
        detail: `Submitted unsupported anomaly report (${newId}) missing packet digest.`,
        outcome: 'warning',
      },
      ...prev,
    ]);

    const t1 = window.setTimeout(() => {
      setStep('sharing');
      setActivePacketPaths([
        ['D', 'A'],
        ['D', 'B'],
        ['D', 'C'],
      ]);
      setStatusMessage(
        `Stage 2/4: Dispatching ${newId} claim to Agents A, B, and C for independent validation.`
      );

      setTimeline((prev) => [
        {
          id: `TL-${Date.now()}-u2`,
          eventId: newId,
          stage: 'Intelligence shared',
          agentLabel: 'Maritime Mesh Relay',
          timestamp: formatUtcNow(),
          detail: 'Circulated report metadata to peer agents for corroboration check.',
          outcome: 'nominal',
        },
        ...prev,
      ]);
    }, 850);

    const t2 = window.setTimeout(() => {
      setStep('verifying');
      setActivePacketPaths([
        ['A', 'D'],
        ['B', 'D'],
        ['C', 'D'],
      ]);
      setStatusMessage(
        `Stage 3/4: Peers found zero corroborating flow logs or gateway signatures for ${newId}.`
      );

      setAgents((prev) =>
        prev.map((a) =>
          a.id === 'D'
            ? a
            : {
                ...a,
                status: 'Verifying',
                lastActive: 'Just now',
                currentActivity: `Rejecting ${newId} — no corroborating evidence in local logs`,
              }
        )
      );

      setAiUsage((prev) => [
        ...prev.slice(1),
        {
          window: formatUtcNow().slice(0, 5),
          requests: 279,
          blocked: 14,
          costUsd: 0.81,
        },
      ]);

      setTimeline((prev) => [
        {
          id: `TL-${Date.now()}-u3`,
          eventId: newId,
          stage: 'Verification started',
          agentLabel: 'Agents A, B & C',
          timestamp: formatUtcNow(),
          detail: 'Peer review found missing evidence hash and zero matching outbound flows.',
          outcome: 'flagged',
        },
        ...prev,
      ]);
    }, 1850);

    const t3 = window.setTimeout(() => {
      const doneTs = formatUtcNow();
      setStep('resolved');
      setActivePacketPaths([]);
      setStatusMessage(
        `Stage 4/4: Report ${newId} flagged as unreliable (Confidence 18.4%). Alert fatigue prevented.`
      );

      setAgents((prev) =>
        prev.map((a) =>
          a.id === 'D'
            ? {
                ...a,
                status: 'Caution',
                trustScore: Number(Math.max(76.0, a.trustScore - 2.4).toFixed(1)),
                historicalAccuracy: Number(
                  Math.max(75.0, a.historicalAccuracy - 2.1).toFixed(1)
                ),
                evidenceCompleteness: Number(
                  Math.max(72.0, a.evidenceCompleteness - 3.0).toFixed(1)
                ),
                lastActive: 'Just now',
                currentActivity: `Report ${newId} flagged unreliable — trust weight recalibrated`,
              }
            : {
                ...a,
                status: 'Active',
                lastActive: 'Just now',
                currentActivity: `Verified false-positive suppression for ${newId}`,
              }
        )
      );

      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === newId
            ? {
                ...ev,
                corroboratedBy: [],
                confidence: 18.4,
                verificationStatus: 'Flagged Unreliable',
                recommendation:
                  'Do not escalate. Quarantine unsupported claim and reduce source node weight.',
              }
            : ev
        )
      );

      setTimeline((prev) => [
        {
          id: `TL-${Date.now()}-u5`,
          eventId: newId,
          stage: 'Recommendation generated',
          agentLabel: 'Aegis Policy',
          timestamp: doneTs,
          detail: 'Suppressed unsupported alert and recalibrated Agent D reliability weight.',
          outcome: 'flagged',
        },
        {
          id: `TL-${Date.now()}-u4`,
          eventId: newId,
          stage: 'Confidence updated',
          agentLabel: 'Quorum 0/3 Corroboration',
          timestamp: doneTs,
          detail: 'Threat confidence dropped from 41.0% to 18.4%; flagged unreliable.',
          outcome: 'flagged',
        },
        ...prev,
      ]);
    }, 2950);

    timersRef.current.push(t1, t2, t3);
  }, [clearTimers]);

  const resetSimulation = useCallback(() => {
    clearTimers();
    setAgents(INITIAL_AGENTS);
    setEvents(INITIAL_EVENTS);
    setTimeline(INITIAL_TIMELINE);
    setAiUsage(INITIAL_AI_USAGE);
    setScenario('idle');
    setStep('idle');
    setActivePacketPaths([]);
    setSelectedAgentId('A');
    setStatusMessage(
      'Mesh nominal. Four independent agents monitoring internal infrastructure.'
    );
  }, [clearTimers]);

  const averageNetworkTrust = useMemo(() => {
    const sum = agents.reduce((acc, a) => acc + a.trustScore, 0);
    return Number((sum / agents.length).toFixed(1));
  }, [agents]);

  const verifiedThreatCount = useMemo(
    () => events.filter((e) => e.verificationStatus === 'Verified').length,
    [events]
  );

  const pendingCount = useMemo(
    () =>
      events.filter(
        (e) =>
          e.verificationStatus === 'Verifying' ||
          e.verificationStatus === 'Pending'
      ).length,
    [events]
  );

  const totalAiRequests = useMemo(
    () => aiUsage.reduce((acc, p) => acc + p.requests, 0),
    [aiUsage]
  );

  const blockedAiRequests = useMemo(
    () => aiUsage.reduce((acc, p) => acc + p.blocked, 0),
    [aiUsage]
  );

  const illustrativeCostUsd = useMemo(
    () =>
      Number(aiUsage.reduce((acc, p) => acc + p.costUsd, 0).toFixed(2)),
    [aiUsage]
  );

  const value: SimulationContextValue = {
    agents,
    events,
    timeline,
    aiUsage,
    selectedAgentId,
    setSelectedAgentId,
    hoveredAgentId,
    setHoveredAgentId,
    scenario,
    step,
    statusMessage,
    activePacketPaths,
    averageNetworkTrust,
    verifiedThreatCount,
    pendingCount,
    totalAiRequests,
    blockedAiRequests,
    illustrativeCostUsd,
    simulateThreat,
    simulateUnreliableReport,
    resetSimulation,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('useSimulation must be used inside SimulationProvider');
  }
  return ctx;
}

import {
  createHash,
  createPrivateKey,
  generateKeyPairSync,
  randomBytes,
  sign as cryptoSign,
  verify as cryptoVerify,
  type KeyObject,
} from 'node:crypto';

/**
 * MARITIME — LAYER 01 · AGENT RUNTIME
 *
 * Hosting layer for independent AI agents. Every agent receives a real
 * ed25519 identity keypair at registration. Agents prove liveness by signing
 * server-issued challenges; the mesh trusts only cryptographically verified
 * identities. Lifecycle: registered → active → suspended → retired.
 */

export type AgentLifecycle = 'registered' | 'active' | 'suspended' | 'retired';

export interface MaritimeAgent {
  id: string;
  code: string;
  name: string;
  role: string;
  host: string;
  capabilities: string[];
  lifecycle: AgentLifecycle;
  fingerprint: string;
  publicKeyPem: string;
  /** Kept server-side to simulate the agent host holding its own key. */
  privateKeyPem: string;
  trustScore: number;
  heartbeats: number;
  registeredAt: string;
  lastHeartbeat: string | null;
  rejectedSignatures: number;
}

function fingerprintKey(publicKeyPem: string): string {
  const digest = createHash('sha256').update(publicKeyPem).digest('hex');
  return (digest.match(/.{2}/g) ?? [])
    .slice(0, 8)
    .join(':')
    .toUpperCase();
}

function newKeypair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey
      .export({ type: 'pkcs8', format: 'pem' })
      .toString(),
  };
}

const SEED_AGENTS: Array<Pick<MaritimeAgent, 'id' | 'code' | 'name' | 'role' | 'host' | 'capabilities' | 'trustScore'>> = [
  {
    id: 'A',
    code: 'NODE A',
    name: 'Agent A — Office Server',
    role: 'Edge Identity & Workstation Telemetry',
    host: 'office-srv-01.internal',
    capabilities: ['workstation.telemetry', 'identity.watch', 'evidence.sign'],
    trustScore: 95.4,
  },
  {
    id: 'B',
    code: 'NODE B',
    name: 'Agent B — Database Server',
    role: 'Query Audit & Privilege Guard',
    host: 'db-core-02.internal',
    capabilities: ['db.audit', 'privilege.guard', 'evidence.verify'],
    trustScore: 96.8,
  },
  {
    id: 'C',
    code: 'NODE C',
    name: 'Agent C — Application Server',
    role: 'API Gateway & Runtime Behavioral Agent',
    host: 'app-mesh-03.internal',
    capabilities: ['api.gateway', 'behavior.model', 'token.velocity'],
    trustScore: 93.1,
  },
  {
    id: 'D',
    code: 'NODE D',
    name: 'Agent D — Backup Server',
    role: 'Immutable Snapshot & Egress Sentinel',
    host: 'vault-bak-04.internal',
    capabilities: ['snapshot.immutable', 'egress.watch', 'flow.hash'],
    trustScore: 91.5,
  },
];

class MaritimeRuntime {
  private agents = new Map<string, MaritimeAgent>();
  private idCounter = 0;

  constructor() {
    for (const seed of SEED_AGENTS) {
      const keys = newKeypair();
      const now = new Date().toISOString();
      this.agents.set(seed.id, {
        ...seed,
        lifecycle: 'active',
        fingerprint: fingerprintKey(keys.publicKeyPem),
        publicKeyPem: keys.publicKeyPem,
        privateKeyPem: keys.privateKeyPem,
        heartbeats: 40 + Math.floor(Math.random() * 60),
        registeredAt: now,
        lastHeartbeat: new Date(Date.now() - Math.random() * 20_000).toISOString(),
        rejectedSignatures: 0,
      });
    }
  }

  list(): MaritimeAgent[] {
    return [...this.agents.values()].filter((a) => a.lifecycle !== 'retired');
  }

  get(id: string): MaritimeAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Register a brand-new agent. Returns the private key exactly once —
   * in a real deployment this would be delivered to the agent host and
   * never seen by the mesh control plane again.
   */
  register(input: {
    name: string;
    role: string;
    host: string;
    capabilities?: string[];
  }): { agent: MaritimeAgent; privateKeyPem: string } {
    this.idCounter += 1;
    const id = `M-${String(this.idCounter).padStart(2, '0')}`;
    const keys = newKeypair();
    const now = new Date().toISOString();
    const agent: MaritimeAgent = {
      id,
      code: `NODE ${id}`,
      name: input.name || `Agent ${id}`,
      role: input.role || 'Unassigned Mesh Agent',
      host: input.host || 'unassigned.internal',
      capabilities: input.capabilities?.length
        ? input.capabilities
        : ['evidence.sign', 'evidence.verify'],
      lifecycle: 'registered',
      fingerprint: fingerprintKey(keys.publicKeyPem),
      publicKeyPem: keys.publicKeyPem,
      privateKeyPem: keys.privateKeyPem,
      trustScore: 85.0,
      heartbeats: 0,
      registeredAt: now,
      lastHeartbeat: null,
      rejectedSignatures: 0,
    };
    this.agents.set(id, agent);
    return { agent, privateKeyPem: keys.privateKeyPem };
  }

  issueChallenge(id: string): string | null {
    if (!this.agents.has(id)) return null;
    return randomBytes(16).toString('hex');
  }

  /** Verify an ed25519 signature over `<agentId>:<challenge>`. */
  verifyHeartbeat(
    id: string,
    challenge: string,
    signatureB64: string
  ): { ok: boolean; reason?: string; agent?: MaritimeAgent } {
    const agent = this.agents.get(id);
    if (!agent) return { ok: false, reason: 'unknown_agent' };
    if (agent.lifecycle === 'retired') return { ok: false, reason: 'retired_agent' };

    const message = Buffer.from(`${id}:${challenge}`, 'utf8');
    const signature = Buffer.from(signatureB64, 'base64');
    let ok = false;
    try {
      const keyObj = this.toKeyObject(agent.privateKeyPem);
      ok = cryptoVerify(null, message, keyObj, signature);
    } catch {
      ok = false;
    }

    if (!ok) {
      agent.rejectedSignatures += 1;
      if (agent.lifecycle === 'active' && agent.rejectedSignatures >= 3) {
        agent.lifecycle = 'suspended';
      }
      return { ok: false, reason: 'invalid_signature' };
    }

    agent.rejectedSignatures = 0;
    agent.heartbeats += 1;
    agent.lastHeartbeat = new Date().toISOString();
    if (agent.lifecycle === 'registered') agent.lifecycle = 'active';
    // Verified liveness slowly compounds trust.
    agent.trustScore = Number(
      Math.min(99.9, agent.trustScore + 0.05).toFixed(2)
    );
    return { ok: true, agent };
  }

  setLifecycle(
    id: string,
    lifecycle: Exclude<AgentLifecycle, 'registered'>
  ): MaritimeAgent | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    agent.lifecycle = lifecycle;
    return agent;
  }

  /** Signed agent identity for evidence bundles. */
  signFor(agentId: string, data: string): string | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;
    try {
      return cryptoSign(
        null,
        Buffer.from(data, 'utf8'),
        this.toKeyObject(agent.privateKeyPem)
      ).toString('base64');
    } catch {
      return null;
    }
  }

  meshSnapshot() {
    const agents = this.list();
    return {
      epoch: Date.now(),
      peers: agents.map((a) => ({
        id: a.id,
        host: a.host,
        lifecycle: a.lifecycle,
        capabilities: a.capabilities,
        trustScore: a.trustScore,
        fingerprint: a.fingerprint,
        latencyMs: 12 + Math.floor(Math.random() * 40),
      })),
      activeCount: agents.filter((a) => a.lifecycle === 'active').length,
      quorumRequirement: 3,
    };
  }

  private toKeyObject(pem: string): KeyObject {
    return createPrivateKey(pem);
  }
}

export const maritime = new MaritimeRuntime();

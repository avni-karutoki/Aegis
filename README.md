# Aegis

**Collaborative cybersecurity network powered by independent AI agents.**
*Trust is not given. It's verified.*

Aegis is a full-stack platform where independent AI agents — running on separate
infrastructure (office, database, application, backup servers) — detect threats,
exchange **cryptographically signed evidence**, and reach **quorum consensus**
before any alert is escalated. Every language-model call in the mesh is forced
through a governance gateway that redacts secrets, blocks prompt injection, and
enforces spend limits.

```
┌─────────────────────────────  FRONTEND (Vite + React 19)  ─────────────────────────────┐
│  Landing (3D hero, architecture story)  ·  Dashboard (6 tabs, live telemetry)          │
│  Simulation mode (works offline)  ⇄  LIVE mode (real backend telemetry)               │
└──────────────────────────────────────┬────────────────────────────────────────────────┘
                                       │ REST /api
┌──────────────────────────────────────▼────────────────────────────────────────────────┐
│                                 BACKEND (Node + Express)                              │
│                                                                                       │
│   MARITIME — LAYER 01 · AGENT RUNTIME          PRUNE — LAYER 02 · MODEL GATEWAY       │
│   • Agent registry (real ed25519 keys)         1. Policy filter (injection blocklist) │
│   • Challenge → sign → verified heartbeat      2. Sanitizer (PII / secret redaction)  │
│   • Lifecycle: registered→active→suspended     3. Token guard (per-call + spend cap)  │
│   • Mesh discovery + quorum consensus          4. Model gateway (Gemini / proxy)      │
│   • Signed evidence bundles                    5. Telemetry (tokens, cost, latency)   │
└──────────────────────────────────────┬────────────────────────────────────────────────┘
                                       │  (only sanitized, budgeted calls leave here)
                                ┌──────▼──────┐
                                │   GEMINI    │  (or deterministic-guard fallback)
                                └─────────────┘
```

---

## 1 · Quick start

```bash
# 1. Install everything (root + server)
npm install
npm install --prefix server

# 2. (Optional) Add a Gemini key for LIVE model verdicts
cp .env.example .env          # then set GEMINI_API_KEY
cp server/.env.example server/.env

# 3. Run BOTH frontend and backend together
npm run dev:all
#   web → http://localhost:3000   (frontend)
#   api → http://localhost:8787   (backend)

# Or run them separately:
npm run server     # backend only
npm run dev        # frontend only
```

**The app works with zero API keys.** Without `GEMINI_API_KEY`, the Prune gateway
runs in *deterministic-guard* mode — the full pipeline (redaction, policy, token
guard, consensus) still executes; verdicts come from an evidence-marker engine
instead of Gemini. With a key, verdicts are real Gemini evaluations.

The navbar shows the current mode: 🟢 **Backend Live** or ⚪ **Simulation Mode**
(simulated data, frontend-only).

---

## 2 · How to demo — what to show, step by step

Open **http://localhost:3000**, then follow this script (~3 minutes):

### Act 1 — The story (landing page, 45s)
1. **Hero + 3D sphere** — "Four independent AI agents guard the infrastructure. No single node is trusted — trust is *earned*."
2. Scroll to **How it works** — the detect → broadcast → verify → consensus loop.
3. Land on **Architectural Stack (section 06)** — point out the two layers:
   **MARITIME (Agent Runtime)** and **PRUNE (Model Gateway)**. With the backend
   running, both cards show a **pulsing LIVE badge** — these aren't marketing
   boxes, they're real running services.

### Act 2 — The threat simulation (dashboard, 60s)
4. Click **Explore Dashboard** → Overview tab.
5. Press **Simulate Threat** (Hero controls). Watch the 4 stages: Agent A
   detects a lateral credential probe → signs an evidence digest → peers B, C,
   D verify independently → quorum 3/3 → confidence jumps **58% → 96.8%** and a
   containment directive is issued.
6. Press **Simulate Unreliable Report** — Agent D's unsupported claim gets
   flagged at **18.4% confidence**. *"This is the anti-false-positive story: alert
   fatigue is engineered away."*

### Act 3 — ⭐ THE CONSENSUS ENGINE (the USP, 90s) ← *lead with this*
7. Open the **Consensus Engine** tab (also linked from the Overview banner).
8. Pick **Coordinated intrusion** → press **Run Live Consensus**. The stage
   tracker animates through all four phases, each backed by a real backend call:
   - **Detect & Sign** — the evidence digest (real SHA-256) and the origin
     agent's real **ed25519 signature** appear.
   - **Mesh Broadcast** — packets animate from the origin across the Maritime
     mesh to peers B, C, D with per-peer relay latency.
   - **Peer Verification** — three verdict cards stream in, one per peer —
     each a **real Prune-governed model call** (mode, redactions, tokens,
     cost, latency shown per card).
   - **Quorum Consensus** — the quorum slots fill with a spring animation,
     the confidence counter eases up to ~96.9%, the policy directive lands,
     and trust-weight recalibration chips show every agent's delta.
9. Run **Unreliable report** — quorum slots stay empty, confidence eases down
   to ~18.5%, alert suppressed, Agent D's trust weight decays. *"Same engine,
   opposite verdict — that's the point."*
10. Bonus for judges: pick **Custom telemetry** and paste your own log line —
    include "packet hash match" to get verified, or "no matching flow record"
    to watch it get rejected. This proves it's not canned.

### Act 4 — The live proof (AI Usage tab, 90s)
7. Go to **AI Usage** tab. Header shows **LIVE — real gateway telemetry**; stat
   cards show actual requests, redactions, and spend from the backend.
8. In the **Prune Gateway Console**, fire the presets in order:
   - **Clean telemetry** → all 4 pipeline stages pass, verdict *CORROBORATED*
     with tokens + cost + latency shown.
   - **PII / secrets leak** → sanitizer stage turns yellow: 5 redactions
     (email, phone, card, API key, password). Show "what the model actually
     received" — the PII is gone *before* the model sees it.
   - **Prompt injection** → **BLOCKED at the policy filter.** The model never
     even loads. "An agent can't be social-engineered into leaking the mesh."
   - **Token over-budget** → blocked at the token guard. "No runaway agent can
     burn the API budget."
9. In the **MARITIME Agent Runtime** panel, click **Join Mesh (demo)** — a new
   agent registers, receives a challenge, signs it with its ed25519 private key,
   and flips to `active`. Show the identity fingerprint. *"Agents prove identity
   with real cryptography, not passwords."*

### Act 5 — Full end-to-end (optional, for judges who want more)
Run the whole mesh loop from the API — real Prune evaluations for every peer:

```bash
curl -X POST http://localhost:8787/api/demo/threat      # → quorum 3/3, VERIFIED, 96.8%
curl -X POST http://localhost:8787/api/demo/unreliable  # → quorum 0/3, FLAGGED, 18.4%
curl http://localhost:8787/api/prune/stats              # → live gateway telemetry
```

### One-line pitch
> *"Agents that verify each other with cryptographic evidence, and a gateway
> that guarantees no AI call ever leaks data, gets hijacked, or burns money."*

---

## 3 · Features & USP

### Core features
| Feature | Where |
|---|---|
| **⭐ Consensus Engine — live quorum verification (USP)** | Dashboard → Consensus Engine tab |
| Multi-agent threat verification with quorum consensus | Dashboard Overview + `/api/demo/*` |
| Trust scoring: reliability, accuracy, evidence completeness, corroboration, consistency | Trust & Verification tab |
| 3D network graph + hero sphere (Three.js) | Landing / Agent Network tab |
| Live incident timeline with cryptographic audit trail | Incident Timeline tab |
| Real agent identities (ed25519), signed heartbeats, lifecycle governance | AI Usage tab → MARITIME panel |
| LLM governance gateway: redaction, injection blocking, spend caps, cost telemetry | AI Usage tab → Prune Console |
| Graceful dual-mode operation (live backend ⇄ offline simulation) | Everywhere — status chips |

### USP — why this is different
1. **Consensus before escalation.** No single agent can raise an alert alone;
   a claim needs independent cryptographic corroboration from peers on separate
   infrastructure. False positives *and* malicious reports die at quorum.
   **The Consensus Engine tab makes this USP watchable live** — real signing,
   real gateway calls, real quorum, real trust math, on stage.
2. **Every AI call is governed, not just logged.** PRUNE is an *inline
   enforcement point* — injection is blocked pre-model, PII is stripped
   pre-transit, spend is capped pre-spend. The model never sees raw data.
3. **Real cryptography in the demo path.** Agent identities are genuine ed25519
   keypairs; heartbeats are genuine signatures the server verifies. The demo
   isn't a mock-up of the security story — it *is* the security story.
4. **Zero-cost demo, one-key upgrade.** Deterministic-guard mode makes the whole
   prototype run offline for free; dropping in a `GEMINI_API_KEY` upgrades
   verdicts to live LLM evaluation with no code change.

---

## 4 · The backend — exactly how it works

### MARITIME (Layer 01 · Agent Runtime) — `server/src/maritime/runtime.ts`

**What it is:** the hosting/identity layer for every agent in the mesh.

**Exactly what happens:**
1. **Registration** — `POST /api/maritime/agents` generates a real **ed25519
   keypair** (Node crypto). The public key's SHA-256 fingerprint is recorded;
   the private key is returned **exactly once** (simulating delivery to the
   agent host — the control plane never sees it again).
2. **Challenge** — `POST /api/maritime/agents/:id/challenge` issues a random
   16-byte nonce. The agent must sign `<agentId>:<challenge>` with its private
   key (this is what a real MARITIME-hosted agent does at boot).
3. **Verified heartbeat** — `POST /api/maritime/agents/:id/heartbeat` verifies
   the signature server-side. On success: heartbeats++, trust +0.05, lifecycle
   `registered → active`. **3 rejected signatures auto-suspend an agent** — a
   tampered/hostile node loses mesh privileges on its own.
4. **Lifecycle governance** — `registered → active → suspended → retired`,
   controlled via `/suspend`, `/activate`, `/retire`.
5. **Evidence signing** — `signFor()` produces the signatures on evidence
   digests that flow through the mesh (used by the demo scenarios).
6. **Mesh discovery** — `GET /api/maritime/mesh` returns the peer table:
   capabilities, lifecycle, trust, fingerprints, latency. Quorum requirement
   is currently 3 of peers.

### PRUNE (Layer 02 · Model Gateway) — `server/src/prune/gateway.ts`

**What it is:** the *mandatory inline middleware* for every language-model call
in the mesh. Nothing reaches Gemini raw. The pipeline:

| Stage | What it does | Blocked calls |
|---|---|---|
| **1 · Policy filter** | Per-agent rate limit (30 req/min), payload size cap (20k chars), prompt-injection & exfiltration regex screen (instruction override, prompt extraction, persona hijack, mode escalation…) | The payload **never leaves the server**; logged as `blocked` with the violation list |
| **2 · Sanitizer** | Regex redaction of private-key blocks, JWTs, API secrets (`sk-`, `AKIA`, `ghp_`, `AIza`…), `password=` style key-value pairs, credit cards, emails, phones — each redaction type is counted and reported | Never blocks — modifies, then reports what changed |
| **3 · Token guard** | Estimates tokens (chars/4) including the system prompt; enforces a per-call ceiling (4,000 tokens) and a **cumulative gateway spend ceiling** ($50) | Over-budget calls die here — cost governance is *pre-spend*, not post-fact |
| **4 · Model gateway** | Routes the *sanitized* payload to Gemini (or forwards to a hosted Prune gateway if `PRUNE_GATEWAY_URL` is set). Three modes: `prune-proxy` → `prune-local-gemini` → `prune-deterministic-guard` (no key needed) | Upstream errors return structured failures |
| **5 · Telemetry** | Every call — allowed or blocked — is logged with decision, redaction count, tokens in/out, estimated cost (real Gemini pricing), latency, and a per-stage trace | — |

`GET /api/prune/stats` and `GET /api/prune/logs` expose the telemetry the
dashboard's AI Usage tab renders live (5s polling).

### Verification verdicts
- **Live mode:** the sanitized payload is sent to Gemini with a strict
  system prompt requiring a JSON verdict (`corroborated`, `confidence`,
  `rationale`, `recommendation`).
- **Guard mode (no key):** an evidence-marker engine grades the payload —
  strong signals ("packet hash match", "flow record", "correlat…") vs.
  contradictions ("no matching", "missing", "unsupported") — producing a
  deterministic verdict. Same interface, same trace, zero cost.

### The end-to-end loop (`POST /api/demo/:scenario`)
1. **Detect** — origin agent signs the evidence digest (real ed25519 signature).
2. **Broadcast** — evidence bundle sent to peer agents via the Maritime mesh.
3. **Verify** — *each peer independently* evaluates the observation **through
   the Prune pipeline** (3 real gateway calls with redaction, budgeting, and
   per-call verdicts).
4. **Consensus** — quorum is computed from actual corroborations:
   ≥3 → `VERIFIED` @ 96.8% with containment directive; <3 → `FLAGGED
   UNRELIABLE` @ 18.4%, alert suppressed, source trust weight reduced.

### API reference
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Service + layer status |
| GET | `/api/maritime/agents` | Agent registry (lifecycle, fingerprints, trust) |
| POST | `/api/maritime/agents` | Register agent → returns identity keypair once |
| POST | `/api/maritime/agents/:id/challenge` | Issue signing nonce |
| POST | `/api/maritime/agents/:id/heartbeat` | Verify ed25519 signature, mark liveness |
| POST | `/api/maritime/agents/:id/suspend\|activate\|retire` | Lifecycle control |
| POST | `/api/maritime/demo-register` | Full join flow (register→challenge→sign→heartbeat) |
| GET | `/api/maritime/mesh` | Peer discovery snapshot |
| GET | `/api/prune/stats` | Gateway telemetry aggregates |
| GET | `/api/prune/logs` | Per-call audit log |
| POST | `/api/prune/evaluate` | Run a payload through the full pipeline |
| GET | `/api/consensus/:id` | Session state |
| POST | `/api/consensus/init` | Start a verification session → digest + ed25519 signature |
| POST | `/api/consensus/:id/broadcast` | Mesh relay to peers (per-peer latency) |
| POST | `/api/consensus/:id/verify` | Every peer evaluates through the Prune gateway |
| POST | `/api/consensus/:id/consensus` | Quorum verdict + trust-weight recalibration |
| POST | `/api/demo/threat` \| `/api/demo/unreliable` | End-to-end mesh verification scenarios |

---

## 5 · Project structure

```
├── src/                        # Frontend (Vite + React 19 + TS)
│   ├── components/
│   │   ├── landing/            # Story sections (hero, problem, stack…)
│   │   ├── dashboard/          # DashboardView + PruneConsole + MaritimePanel
│   │   ├── three/              # 3D hero sphere + network graph
│   │   └── Navbar.tsx          # … with Backend Live / Simulation chip
│   ├── context/
│   │   ├── SimulationContext   # Offline simulation engine
│   │   └── BackendContext      # Backend health + live Prune stats polling
│   ├── lib/api.ts              # Typed REST client (MARITIME + PRUNE)
│   └── types/sentinel.ts       # Shared domain types
└── server/                     # Backend (Node 18+ + Express + TS)
    └── src/
        ├── maritime/runtime.ts # Agent registry, ed25519 identity, lifecycle
        ├── prune/gateway.ts    # 5-stage model-call governance pipeline
        ├── gemini.ts           # Gemini client + deterministic fallback
        ├── routes.ts           # REST API + demo scenario runner
        └── index.ts            # Express app entry (port 8787)
```

## 6 · Troubleshooting
- **Navbar says "Simulation Mode"** → backend isn't running: `npm run server`.
- **Gemini shows `deterministic-guard`** → set `GEMINI_API_KEY` in `server/.env`
  and restart.
- **Port 8787 busy** → change `PORT` in `server/.env` and `VITE_API_URL` in root
  `.env`.
- **`npm.ps1` blocked on Windows** → use `npm.cmd` or set an execution policy.

## 7 · Deployment (Vercel + Render)

Deploy the **backend on Render** and the **frontend on Vercel**. Config for
both is already in the repo (`render.yaml`, `vercel.json`).

### Step 1 — Backend on Render (deploy this FIRST)
1. Push this repo to GitHub (already done).
2. Render Dashboard → **New → Blueprint** → select `avni-karutoki/Aegis-VihaanX`
   — Render reads `render.yaml` and creates the `aegis-api` web service.
3. When prompted, set the secret env vars:
   - `GEMINI_API_KEY` (from Google AI Studio) — without it the gateway runs in
     deterministic-guard mode (still fully functional).
   - `CORS_ORIGIN` — you can leave it empty now and lock it to your Vercel
     domain after Step 2.
4. Deploy → copy the service URL, e.g. `https://aegis-api.onrender.com`
   (health check: `/api/health`).

### Step 2 — Frontend on Vercel
1. Vercel → **Add New → Project** → import the same repo.
2. Framework preset: **Vite** (auto-detected via `vercel.json`).
3. **Before deploying**, add the environment variable:
   - `VITE_API_URL` = `https://aegis-api.onrender.com` (your Render URL)
   This is **required** — without it the built site would try to call
   `localhost:8787`.
4. Deploy → you get `https://<project>.vercel.app`.
5. Recommended: back in Render, set `CORS_ORIGIN` to that exact Vercel URL
   and redeploy the API — CORS is now locked to your frontend only.

### Production notes
- **Free-tier cold starts:** Render free services sleep after ~15 min idle
  (~30–50 s wake-up). Open the site a couple of minutes before demoing.
  The frontend's Simulation Mode fallback covers any sleepy window.
- **Secrets:** the Gemini key only ever lives in Render's env store — the
  browser never sees it (that's the point of the Prune gateway architecture).
- **Local dev is unaffected:** with no env vars set, everything defaults to
  `localhost:3000` + `localhost:8787` exactly as before.

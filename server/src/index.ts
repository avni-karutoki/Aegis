import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { api } from './routes.js';

const app = express();

app.use(cors(config.corsOrigin.length > 0 ? { origin: config.corsOrigin } : {}));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({
    service: 'Aegis SentinelMesh Backend',
    layers: { maritime: 'agent runtime', prune: 'model gateway' },
    docs: 'See README.md · endpoints under /api',
  });
});

app.use('/api', api);

app.listen(config.port, () => {
  console.log(`[aegis] backend listening on http://localhost:${config.port}`);
  console.log('[aegis] MARITIME agent runtime: online');
  console.log('[aegis] PRUNE model gateway: online');
  console.log(
    `[aegis] Gemini: ${config.gemini.apiKey ? 'LIVE (' + config.gemini.model + ')' : 'deterministic guard mode (set GEMINI_API_KEY for live verdicts)'}`
  );
});

import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import Docker from 'dockerode';
import { collectTopology, emptyTopology, flattenContainers, flattenNetworks } from './infraTopology.js';

const PORT = Number(process.env.PORT || 3002);
const NETDATA_URL = process.env.NETDATA_URL || 'http://172.17.0.1:19999';
const PULSE_INTERVAL_MS = Number(process.env.PULSE_INTERVAL_MS || 5000);
const SNAPSHOT_TTL_MS = 3000;

const DASHBOARD_PASS = process.env.DASHBOARD_PASS || '';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function makeSessionToken() {
  return crypto.createHmac('sha256', SESSION_SECRET).update(DASHBOARD_PASS).digest('hex');
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((c) => {
    const [key, ...v] = c.trim().split('=');
    if (key) cookies[key] = decodeURIComponent(v.join('='));
  });
  return cookies;
}

function isAuthed(req) {
  if (!DASHBOARD_PASS) return true;
  const cookies = parseCookies(req.headers.cookie);
  return cookies.dashboard_session === makeSessionToken();
}

let docker;
try {
  docker = new Docker({ socketPath: '/var/run/docker.sock' });
} catch (e) {
  console.warn('Docker socket not available:', e.message);
}

async function getNetdataChart(chart, after = -3600, points = 60) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${NETDATA_URL}/api/v1/data?chart=${chart}&after=${after}&points=${points}&format=json`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getNetdataInfo() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${NETDATA_URL}/api/v1/info`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

let snapshotCache = null;
let snapshotCacheAt = 0;
let snapshotInFlight = null;

async function getSnapshot(minutes = 60) {
  const now = Date.now();
  if (snapshotCache && now - snapshotCacheAt < SNAPSHOT_TTL_MS) return snapshotCache;
  if (snapshotInFlight) return snapshotInFlight;

  snapshotInFlight = collectTopology({ docker, getNetdataChart, getNetdataInfo, minutes })
    .then((topology) => {
      snapshotCache = topology;
      snapshotCacheAt = Date.now();
      return topology;
    })
    .finally(() => {
      snapshotInFlight = null;
    });

  return snapshotInFlight;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'status-dashboard-api', time: new Date().toISOString() });
});

app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (!DASHBOARD_PASS || password === DASHBOARD_PASS) {
    res.setHeader(
      'Set-Cookie',
      `dashboard_session=${makeSessionToken()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 3600}`
    );
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Неверный пароль' });
});

app.get('/api/auth-check', (req, res) => {
  if (isAuthed(req)) return res.json({ ok: true });
  res.status(401).json({ error: 'Unauthorized' });
});

app.use('/api', (req, res, next) => {
  if (req.path === '/login' || req.path === '/auth-check' || req.path === '/health') return next();
  if (isAuthed(req)) return next();
  res.status(401).json({ error: 'Unauthorized' });
});

app.get('/api/topology', async (req, res) => {
  const minutes = Math.min(Number.parseInt(req.query.minutes, 10) || 60, 1440);
  try {
    res.json(await getSnapshot(minutes));
  } catch (err) {
    console.warn('topology error:', err.message);
    res.json(emptyTopology());
  }
});

app.get('/api/containers', async (_req, res) => {
  try {
    res.json(flattenContainers(await getSnapshot()));
  } catch (err) {
    console.warn('containers error:', err.message);
    res.json([]);
  }
});

app.get('/api/networks', async (_req, res) => {
  try {
    res.json(flattenNetworks(await getSnapshot()));
  } catch (err) {
    console.warn('networks error:', err.message);
    res.json([]);
  }
});

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
});

io.use((socket, next) => {
  if (!DASHBOARD_PASS) return next();
  const cookies = parseCookies(socket.handshake.headers.cookie);
  if (cookies.dashboard_session === makeSessionToken()) return next();
  next(new Error('Unauthorized'));
});

io.on('connection', async (socket) => {
  socket.emit('pulse', await getSnapshot());
});

setInterval(async () => {
  if (!io.engine.clientsCount) return;
  io.emit('pulse', await getSnapshot());
}, PULSE_INTERVAL_MS);

httpServer.listen(PORT, () => {
  console.log(`status-dashboard-api listening on :${PORT}`);
});

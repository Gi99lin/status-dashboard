// Demo mode: serves canned topology client-side, no backend, no auth.
// Activated at build time (VITE_DEMO=1) or by hostname (demo. / infra.).
import { demoContainers, demoNetworks, demoTopology } from '../demo/demoTopology';

export function isDemoMode(): boolean {
  const env = import.meta.env?.VITE_DEMO;
  if (env === '1' || env === 'true') return true;
  const host = globalThis.location?.hostname ?? '';
  return host.startsWith('demo.') || host.startsWith('infra.');
}

export const DEMO = isDemoMode();

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Drop-in replacement for fetch() on /api/* routes. In demo mode it answers
// locally; otherwise it forwards to the real backend.
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  if (!DEMO) return fetch(input, init);
  const path = new URL(input, 'http://demo.local').pathname;
  if (path === '/api/auth-check' || path === '/api/login') return Promise.resolve(jsonResponse({ ok: true }));
  if (path === '/api/topology') return Promise.resolve(jsonResponse(demoTopology()));
  if (path === '/api/containers') return Promise.resolve(jsonResponse(demoContainers()));
  if (path === '/api/networks') return Promise.resolve(jsonResponse(demoNetworks()));
  return Promise.resolve(jsonResponse({}));
}

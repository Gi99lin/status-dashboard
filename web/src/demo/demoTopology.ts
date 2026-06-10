// Canned topology for the public demo (infra.gigglin.tech / VITE_DEMO=1).
// No backend, no Docker socket — this is fake, representative homelab data so
// the map can be shown publicly without leaking the real infrastructure.
// Mirrors the shape produced by api/src/infraTopology.js.
import type {
  FlatContainer,
  FlatNetwork,
  NetworkGroup,
  StandaloneNode,
  Telemetry,
  Topology,
  TopologyEdge,
} from '../types';

// Slight per-call jitter so the polling demo looks alive without a backend.
function jit(base: number, spread: number, min = 0): number {
  const v = base + (Math.random() - 0.5) * spread;
  return Math.max(min, Math.round(v * 10) / 10);
}

const NETWORKS: NetworkGroup[] = [
  {
    name: 'proxy_network',
    driver: 'bridge',
    external: true,
    services: [
      { name: 'nginx-proxy-manager', image: 'jc21/nginx-proxy-manager:latest', tech: 'Nginx', role: 'gateway', status: 'running', uptime: '21д', restarts: 0, cpu: 0.6, mem: 84, url: 'https://gigglin.tech' },
      { name: 'landing', image: 'ghcr.io/gi99lin/portfolio:latest', tech: 'Nginx', role: 'app', status: 'running', uptime: '6д', restarts: 0, cpu: 0.2, mem: 18, url: 'https://ivanyakimkin.ru' },
    ],
  },
  {
    name: 'guacamole_default',
    driver: 'bridge',
    external: false,
    services: [
      { name: 'guacamole-web', image: 'guacamole/guacamole:1.5.5', tech: 'Java', role: 'app', status: 'running', uptime: '21д', restarts: 0, cpu: 1.1, mem: 196, url: 'https://remote.gigglin.tech' },
      { name: 'guacd', image: 'guacamole/guacd:1.5.5', tech: 'C', role: 'worker', status: 'running', uptime: '21д', restarts: 0, cpu: 0.3, mem: 8 },
      { name: 'guac-postgres', image: 'postgres:15-alpine', tech: 'PostgreSQL', role: 'db', status: 'running', uptime: '21д', restarts: 0, cpu: 0.4, mem: 31 },
    ],
  },
  {
    name: 'life-dashboard_default',
    driver: 'bridge',
    external: false,
    services: [
      { name: 'life-dashboard-frontend', image: 'ghcr.io/gi99lin/life-dashboard-frontend:latest', tech: 'Nginx', role: 'app', status: 'running', uptime: '6д', restarts: 0, cpu: 0.2, mem: 22, url: 'https://dash.gigglin.tech' },
      { name: 'life-dashboard-api', image: 'ghcr.io/gi99lin/life-dashboard-api:latest', tech: 'Node', role: 'app', status: 'running', uptime: '6д', restarts: 1, cpu: 0.9, mem: 88 },
      { name: 'life-dashboard-collector', image: 'ghcr.io/gi99lin/life-dashboard-collector:latest', tech: 'Python', role: 'worker', status: 'running', uptime: '6д', restarts: 0, cpu: 0.5, mem: 64 },
    ],
  },
  {
    name: 'omniroute_default',
    driver: 'bridge',
    external: false,
    services: [
      { name: 'omniroute', image: 'ghcr.io/gi99lin/omniroute:latest', tech: 'Node', role: 'app', status: 'running', uptime: '14д', restarts: 0, cpu: 1.4, mem: 142, url: 'https://omnirout.gigglin.tech' },
      { name: 'omniroute-redis', image: 'redis:7-alpine', tech: 'Redis', role: 'cache', status: 'running', uptime: '14д', restarts: 0, cpu: 0.2, mem: 12 },
    ],
  },
  {
    name: 'librechat_default',
    driver: 'bridge',
    external: false,
    services: [
      { name: 'librechat', image: 'ghcr.io/danny-avila/librechat:latest', tech: 'Node', role: 'app', status: 'running', uptime: '9д', restarts: 0, cpu: 1.2, mem: 178, url: 'https://chat.gigglin.tech' },
      { name: 'librechat-mongo', image: 'mongo:7', tech: 'MongoDB', role: 'db', status: 'running', uptime: '9д', restarts: 0, cpu: 0.7, mem: 156 },
      { name: 'librechat-meili', image: 'getmeili/meilisearch:v1.7', tech: 'Meilisearch', role: 'worker', status: 'warning', uptime: '2ч', restarts: 3, cpu: 0.4, mem: 74 },
    ],
  },
  {
    name: 'nextcloud_default',
    driver: 'bridge',
    external: false,
    services: [
      { name: 'nextcloud', image: 'nextcloud:29-apache', tech: 'PHP', role: 'app', status: 'running', uptime: '30д', restarts: 0, cpu: 1.0, mem: 214, url: 'https://cloud.gigglin.tech' },
      { name: 'nextcloud-db', image: 'mariadb:11', tech: 'MariaDB', role: 'db', status: 'running', uptime: '30д', restarts: 0, cpu: 0.6, mem: 132 },
    ],
  },
];

const STANDALONE: StandaloneNode[] = [
  { name: 'Netdata', id: 'netdata', role: 'monitor', status: 'running', tech: 'Netdata' },
  { name: 'внешние LLM', id: 'ext-llm', role: 'external', status: 'running', reachable: true },
  { name: 'work-vm', id: 'work-vm', role: 'vm', status: 'running', tech: 'RDP', via: 'guacamole', open: 'https://remote.gigglin.tech' },
];

const EDGES: TopologyEdge[] = [
  { from: 'internet', to: 'nginx-proxy-manager', type: 'http' },
  { from: 'nginx-proxy-manager', to: 'guacamole_default', type: 'http' },
  { from: 'nginx-proxy-manager', to: 'life-dashboard_default', type: 'http' },
  { from: 'nginx-proxy-manager', to: 'omniroute_default', type: 'http' },
  { from: 'nginx-proxy-manager', to: 'librechat_default', type: 'http' },
  { from: 'nginx-proxy-manager', to: 'nextcloud_default', type: 'http' },
  { from: 'Netdata', to: 'life-dashboard_default', type: 'monitor' },
  { from: 'Netdata', to: 'guacamole_default', type: 'monitor' },
  { from: 'guacamole-web', to: 'work-vm', type: 'rdp' },
  { from: 'omniroute', to: 'внешние LLM', type: 'http' },
];

function telemetry(): Telemetry {
  const now = Date.now();
  const points = 60;
  const make = (base: number, amp: number) =>
    Array.from({ length: points }, (_, i) => ({
      t: now - (points - i) * 60_000,
      value: Math.max(0, Math.round((base + Math.sin(i / 6) * amp + (Math.random() - 0.5) * amp) * 10) / 10),
    }));
  return { cpu: make(22, 8), ram: make(58, 6), net: make(0.8, 0.5) };
}

function jitterServices(services: NetworkGroup['services']) {
  return services.map((s) => ({
    ...s,
    cpu: s.cpu === undefined ? undefined : jit(s.cpu, s.cpu * 0.6),
    mem: s.mem === undefined ? undefined : jit(s.mem, Math.max(2, s.mem * 0.1), 1),
  }));
}

export function demoTopology(): Topology {
  return {
    host: {
      name: 'gigglin-server',
      uptime: '21д',
      cpu: jit(22, 10),
      ram: jit(58, 6),
      disk: 68,
      net: jit(0.8, 0.6),
      vcpu: 8,
      ram_total: 16,
      os: 'Ubuntu 24.04 LTS',
      containers: { total: 16, running: 15 },
    },
    telemetry: telemetry(),
    networks: NETWORKS.map((n) => ({ ...n, services: jitterServices(n.services) })),
    standalone: STANDALONE,
    edges: EDGES,
  };
}

export function demoContainers(): FlatContainer[] {
  return NETWORKS.flatMap((n) =>
    jitterServices(n.services).map((s) => ({ ...s, networks: [n.name] })),
  );
}

export function demoNetworks(): FlatNetwork[] {
  return NETWORKS.map((n) => ({
    name: n.name,
    driver: n.driver,
    external: n.external,
    containers: n.services.length,
    members: n.services.map((s) => s.name),
  }));
}

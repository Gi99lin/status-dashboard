// Canned topology for the public demo (infra.gigglin.tech / VITE_DEMO=1).
// No backend, no Docker socket — fake, representative homelab data so the map
// can be shown publicly without leaking the real infrastructure.
//
// Shape + node ids match what api/src/infraTopology.js produces AND what the
// map's layout resolver expects (src/sections/Map/layout.ts): a STANDALONE
// gateway named "nginx", a standalone id "external-llm", and edges that
// reference network names / "nginx" / "Netdata" / "guacamole" / "omniroute".
import type {
  FlatContainer,
  FlatNetwork,
  NetworkGroup,
  ServiceGroup,
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
      { name: 'landing', image: 'ghcr.io/gi99lin/portfolio:latest', tech: 'Nginx', role: 'app', status: 'running', uptime: '6д', restarts: 0, cpu: 0.2, mem: 18, url: 'https://ivanyakimkin.ru' },
      { name: 'npm-db', image: 'jc21/mariadb-aria:latest', tech: 'MariaDB', role: 'db', status: 'running', uptime: '34д', restarts: 0, cpu: 0.3, mem: 96 },
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
      { name: 'librechat-rag', image: 'ghcr.io/danny-avila/librechat-rag-api:latest', tech: 'Python', role: 'worker', status: 'running', uptime: '9д', restarts: 0, cpu: 0.5, mem: 98 },
    ],
  },
  {
    name: 'nextcloud_default',
    driver: 'bridge',
    external: false,
    services: [
      { name: 'nextcloud', image: 'nextcloud:29-apache', tech: 'PHP', role: 'app', status: 'running', uptime: '30д', restarts: 0, cpu: 1.0, mem: 214, url: 'https://cloud.gigglin.tech' },
      { name: 'nextcloud-db', image: 'mariadb:11', tech: 'MariaDB', role: 'db', status: 'running', uptime: '30д', restarts: 0, cpu: 0.6, mem: 132 },
      { name: 'nextcloud-redis', image: 'redis:7-alpine', tech: 'Redis', role: 'cache', status: 'running', uptime: '30д', restarts: 0, cpu: 0.2, mem: 14 },
    ],
  },
  {
    name: 'matrix_default',
    driver: 'bridge',
    external: false,
    services: [
      { name: 'synapse', image: 'matrixdotorg/synapse:latest', tech: 'Python', role: 'app', status: 'running', uptime: '18д', restarts: 0, cpu: 1.6, mem: 268, url: 'https://matrix.gigglin.tech' },
      { name: 'element', image: 'vectorim/element-web:latest', tech: 'Nginx', role: 'app', status: 'running', uptime: '18д', restarts: 0, cpu: 0.2, mem: 20, url: 'https://element.gigglin.tech' },
      { name: 'mas', image: 'ghcr.io/element-hq/matrix-authentication-service:latest', tech: 'Rust', role: 'worker', status: 'running', uptime: '18д', restarts: 0, cpu: 0.3, mem: 42 },
      { name: 'matrix-postgres', image: 'postgres:16-alpine', tech: 'PostgreSQL', role: 'db', status: 'running', uptime: '18д', restarts: 0, cpu: 0.7, mem: 184 },
      { name: 'livekit', image: 'livekit/livekit-server:latest', tech: 'Go', role: 'worker', status: 'running', uptime: '18д', restarts: 0, cpu: 0.5, mem: 58 },
    ],
  },
  {
    name: 'marzneshin_host',
    driver: 'host',
    external: false,
    services: [
      { name: 'marzneshin', image: 'dawsh/marzneshin:latest', tech: 'Python', role: 'app', status: 'running', uptime: '27д', restarts: 0, cpu: 0.8, mem: 124, url: 'https://vpn.gigglin.tech' },
      { name: 'marznode', image: 'dawsh/marznode:latest', tech: 'Xray', role: 'worker', status: 'running', uptime: '27д', restarts: 0, cpu: 0.6, mem: 46 },
      { name: 'marzneshin-db', image: 'mariadb:11', tech: 'MariaDB', role: 'db', status: 'running', uptime: '27д', restarts: 0, cpu: 0.3, mem: 88 },
    ],
  },
  {
    name: 'openclaw_default',
    driver: 'bridge',
    external: false,
    services: [
      { name: 'openclaw', image: 'ghcr.io/gi99lin/openclaw:latest', tech: 'Node', role: 'app', status: 'running', uptime: '11д', restarts: 0, cpu: 1.3, mem: 188 },
      { name: 'openclaw-worker', image: 'ghcr.io/gi99lin/openclaw-worker:latest', tech: 'Node', role: 'worker', status: 'running', uptime: '11д', restarts: 2, cpu: 0.9, mem: 142 },
      { name: 'openclaw-redis', image: 'redis:7-alpine', tech: 'Redis', role: 'cache', status: 'running', uptime: '11д', restarts: 0, cpu: 0.2, mem: 16 },
    ],
  },
  {
    name: 'hermes_default',
    driver: 'bridge',
    external: false,
    services: [
      { name: 'hermes-qa', image: 'ghcr.io/gi99lin/hermes-qa:latest', tech: 'Python', role: 'worker', status: 'running', uptime: '8д', restarts: 0, cpu: 0.6, mem: 96 },
      { name: 'hermes-finanalyst', image: 'ghcr.io/gi99lin/hermes-finanalyst:latest', tech: 'Python', role: 'worker', status: 'warning', uptime: '40м', restarts: 5, cpu: 0.7, mem: 104 },
    ],
  },
  {
    name: 'syncthing_default',
    driver: 'bridge',
    external: false,
    services: [
      { name: 'syncthing', image: 'syncthing/syncthing:latest', tech: 'Go', role: 'app', status: 'running', uptime: '34д', restarts: 0, cpu: 0.4, mem: 72, url: 'https://sync.gigglin.tech' },
    ],
  },
];

const STANDALONE: StandaloneNode[] = [
  { name: 'nginx', id: 'nginx', role: 'gateway', status: 'running', tech: 'Nginx', cpu: 0.6 },
  { name: 'Netdata', id: 'netdata', role: 'monitor', status: 'running', tech: 'Netdata' },
  { name: 'внешние LLM', id: 'external-llm', role: 'external', status: 'running', reachable: true },
  { name: 'work-vm', id: 'work-vm', role: 'vm', status: 'running', tech: 'RDP', via: 'guacamole', open: 'https://remote.gigglin.tech' },
];

const EDGES: TopologyEdge[] = [
  { from: 'internet', to: 'nginx', type: 'http' },
  { from: 'nginx', to: 'proxy_network', type: 'http' },
  { from: 'nginx', to: 'guacamole_default', type: 'http' },
  { from: 'nginx', to: 'life-dashboard_default', type: 'http' },
  { from: 'nginx', to: 'omniroute_default', type: 'http' },
  { from: 'nginx', to: 'librechat_default', type: 'http' },
  { from: 'nginx', to: 'nextcloud_default', type: 'http' },
  { from: 'nginx', to: 'matrix_default', type: 'http' },
  { from: 'nginx', to: 'marzneshin_host', type: 'http' },
  { from: 'nginx', to: 'syncthing_default', type: 'http' },
  { from: 'Netdata', to: 'life-dashboard_default', type: 'monitor' },
  { from: 'Netdata', to: 'matrix_default', type: 'monitor' },
  { from: 'Netdata', to: 'guacamole_default', type: 'monitor' },
  { from: 'omniroute', to: 'external-llm', type: 'http' },
  { from: 'guacamole', to: 'work-vm', type: 'rdp' },
];

function telemetry(): Telemetry {
  const now = Date.now();
  const points = 60;
  const make = (base: number, amp: number) =>
    Array.from({ length: points }, (_, i) => ({
      t: now - (points - i) * 60_000,
      value: Math.max(0, Math.round((base + Math.sin(i / 6) * amp + (Math.random() - 0.5) * amp) * 10) / 10),
    }));
  return { cpu: make(28, 9), ram: make(63, 6), net: make(1.1, 0.6) };
}

function jitterServices(services: NetworkGroup['services']) {
  return services.map((s) => ({
    ...s,
    cpu: s.cpu === undefined ? undefined : jit(s.cpu, s.cpu * 0.6),
    mem: s.mem === undefined ? undefined : jit(s.mem, Math.max(2, s.mem * 0.1), 1),
  }));
}

const TOTAL = NETWORKS.reduce((n, net) => n + net.services.length, 0) + 1; // + gateway

export function demoTopology(): Topology {
  const groups = NETWORKS.map((n): ServiceGroup => ({
    name: n.name,
    services: jitterServices(n.services),
    // Publicly-routed groups also share the external proxy network — this is
    // what produces the shared-network links between cards on the map.
    networks: n.services.some((s) => s.url) ? [n.name, 'my_server_proxy_network'] : [n.name],
    driver: n.driver,
  }));

  return {
    host: {
      name: 'gigglin-server',
      uptime: '34д',
      cpu: jit(28, 10),
      ram: jit(63, 6),
      disk: 71,
      net: jit(1.1, 0.6),
      vcpu: 8,
      ram_total: 16,
      os: 'Ubuntu 24.04 LTS',
      containers: { total: TOTAL, running: TOTAL - 2 },
    },
    telemetry: telemetry(),
    networks: NETWORKS.map((n) => ({ ...n, services: jitterServices(n.services) })),
    groups,
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

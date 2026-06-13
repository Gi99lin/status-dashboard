// Canned topology for the public demo (infra.gigglin.tech / VITE_DEMO=1).
// No backend, no Docker socket. Mirrors the real stack's structure so the demo
// looks current, but business/client projects are genericized (hrbot→scraper,
// ai-presentation→docflow, ai-testcase-generator→qa-runner, hermes→obs-agent,
// trueconf→media-relay) so nothing private leaks on the public map.
//
// Shape + node ids match what api/src/infraTopology.js produces AND what the
// map's layout resolver expects (src/sections/Map/layout.ts): a STANDALONE
// gateway "nginx", a standalone id "external-llm", and edges referencing group
// names / "nginx" / "Netdata" / "guacamole" / "omniroute".
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

const PROXY = 'my_server_proxy_network';

// One entry per docker-compose project (= one map card), mirroring the real
// stack. `nets` are the docker networks the card belongs to (shown as tags).
interface DemoGroup extends NetworkGroup {
  nets: string[];
}

const NETWORKS: DemoGroup[] = [
  {
    name: 'docflow', driver: 'bridge', external: false, nets: ['docflow_default', PROXY],
    services: [
      { name: 'docflow-api', image: 'ghcr.io/acme/docflow-api:latest', tech: 'Node', role: 'app', status: 'running', uptime: '5д', restarts: 0, cpu: 0.9, mem: 235 },
      { name: 'docflow-web', image: 'ghcr.io/acme/docflow-web:latest', tech: 'Nginx', role: 'app', status: 'running', uptime: '5д', restarts: 0, cpu: 0.2, mem: 12 },
    ],
  },
  {
    name: 'qa-runner', driver: 'bridge', external: false, nets: ['qa-runner_default', PROXY],
    services: [
      { name: 'qa-runner', image: 'ghcr.io/acme/qa-runner:latest', tech: 'Python', role: 'app', status: 'running', uptime: '3д', restarts: 0, cpu: 0.7, mem: 135 },
      { name: 'qa-runner-db', image: 'postgres:16-alpine', tech: 'pg', role: 'db', status: 'running', uptime: '3д', restarts: 0, cpu: 0.3, mem: 47 },
    ],
  },
  {
    name: 'guacamole', driver: 'bridge', external: false, nets: ['guacamole_default', PROXY],
    services: [
      { name: 'guacamole-web', image: 'guacamole/guacamole:1.5.5', tech: 'Java', role: 'app', status: 'running', uptime: '21д', restarts: 0, cpu: 1.1, mem: 196, url: 'https://rdp.gigglin.tech' },
      { name: 'guacamole-guacd', image: 'guacamole/guacd:1.5.5', tech: 'Java', role: 'app', status: 'running', uptime: '21д', restarts: 0, cpu: 0.3, mem: 18 },
      { name: 'guacamole-postgres', image: 'postgres:15-alpine', tech: 'pg', role: 'db', status: 'running', uptime: '21д', restarts: 0, cpu: 0.4, mem: 65 },
    ],
  },
  {
    name: 'obs-agent', driver: 'bridge', external: false, nets: [PROXY],
    services: [
      { name: 'obs-agent', image: 'ghcr.io/acme/obs-agent:latest', tech: 'Go', role: 'app', status: 'running', uptime: '8д', restarts: 0, cpu: 0.6, mem: 96 },
    ],
  },
  {
    name: 'scraper-dev', driver: 'bridge', external: false, nets: ['scraper-dev_default'],
    services: [
      { name: 'scraper-dev-app', image: 'ghcr.io/acme/scraper:dev', tech: 'Node', role: 'app', status: 'running', uptime: '4д', restarts: 1, cpu: 1.0, mem: 112 },
      { name: 'scraper-dev-browser', image: 'browserless/chrome:latest', tech: 'chrome', role: 'app', status: 'running', uptime: '4д', restarts: 0, cpu: 0.8, mem: 170 },
      { name: 'scraper-dev-db', image: 'postgres:16-alpine', tech: 'pg', role: 'db', status: 'running', uptime: '4д', restarts: 0, cpu: 0.3, mem: 24 },
      { name: 'scraper-dev-redis', image: 'redis:7-alpine', tech: 'Redis', role: 'cache', status: 'running', uptime: '4д', restarts: 0, cpu: 0.2, mem: 4 },
    ],
  },
  {
    name: 'scraper-prod', driver: 'bridge', external: false, nets: ['scraper-prod_default'],
    services: [
      { name: 'scraper-prod-app', image: 'ghcr.io/acme/scraper:prod', tech: 'Node', role: 'app', status: 'running', uptime: '12д', restarts: 0, cpu: 1.1, mem: 152 },
      { name: 'scraper-prod-browser', image: 'browserless/chrome:latest', tech: 'chrome', role: 'app', status: 'running', uptime: '12д', restarts: 0, cpu: 0.9, mem: 382 },
      { name: 'scraper-prod-db', image: 'postgres:16-alpine', tech: 'pg', role: 'db', status: 'running', uptime: '12д', restarts: 0, cpu: 0.3, mem: 34 },
      { name: 'scraper-prod-redis', image: 'redis:7-alpine', tech: 'Redis', role: 'cache', status: 'running', uptime: '12д', restarts: 0, cpu: 0.2, mem: 6 },
    ],
  },
  {
    name: 'librechat', driver: 'bridge', external: false, nets: ['librechat_default', PROXY],
    services: [
      { name: 'LibreChat', image: 'ghcr.io/danny-avila/librechat-dev:latest', tech: 'Node', role: 'app', status: 'running', uptime: '9д', restarts: 0, cpu: 1.2, mem: 730, url: 'https://chat.gigglin.tech' },
      { name: 'chat-mongodb', image: 'mongo:7', tech: 'mongo', role: 'data', status: 'running', uptime: '9д', restarts: 0, cpu: 0.7, mem: 220 },
      { name: 'chat-meilisearch', image: 'getmeili/meilisearch:v1.7', tech: 'meilisearch', role: 'data', status: 'running', uptime: '9д', restarts: 0, cpu: 0.4, mem: 124 },
      { name: 'chat-rag_api', image: 'ghcr.io/danny-avila/librechat-rag-api-dev-lite:latest', tech: 'Python', role: 'app', status: 'running', uptime: '9д', restarts: 0, cpu: 0.5, mem: 185 },
      { name: 'chat-vectordb', image: 'pgvector/pgvector:pg16', tech: 'pgvector', role: 'db', status: 'running', uptime: '9д', restarts: 0, cpu: 0.3, mem: 53 },
      { name: 'chat-code-interpreter-api', image: 'librechat/code-interpreter:latest', tech: 'Node', role: 'app', status: 'warning', uptime: '40м', restarts: 4, cpu: 0.4, mem: 0 },
      { name: 'chat-code-interpreter-minio', image: 'minio/minio:latest', tech: 'minio', role: 'app', status: 'running', uptime: '9д', restarts: 0, cpu: 0.2, mem: 151 },
      { name: 'chat-code-interpreter-redis', image: 'redis:7-alpine', tech: 'Redis', role: 'cache', status: 'running', uptime: '9д', restarts: 0, cpu: 0.2, mem: 12 },
      { name: 'chat-code-interpreter-minio-init', image: 'minio/mc:latest', tech: 'mc', role: 'app', status: 'exited', uptime: '5д', restarts: 0, cpu: 0, mem: 0 },
    ],
  },
  {
    name: 'life-dashboard', driver: 'bridge', external: false, nets: ['life-dashboard_default', PROXY],
    services: [
      { name: 'life-dashboard', image: 'ghcr.io/gi99lin/life-dashboard-frontend:latest', tech: 'Nginx', role: 'app', status: 'running', uptime: '6д', restarts: 0, cpu: 0.2, mem: 11 },
      { name: 'life-dashboard-api', image: 'ghcr.io/gi99lin/life-dashboard-api:latest', tech: 'Node', role: 'app', status: 'running', uptime: '6д', restarts: 1, cpu: 0.9, mem: 42 },
      { name: 'life-dashboard-collector', image: 'ghcr.io/gi99lin/life-dashboard-collector:latest', tech: 'Python', role: 'worker', status: 'running', uptime: '6д', restarts: 0, cpu: 0.4, mem: 16 },
    ],
  },
  {
    name: 'life-dashboard-demo', driver: 'bridge', external: false, nets: [PROXY],
    services: [
      { name: 'life-dashboard-demo', image: 'ghcr.io/gi99lin/life-dashboard-frontend-demo:latest', tech: 'Nginx', role: 'app', status: 'running', uptime: '6д', restarts: 0, cpu: 0.2, mem: 11, url: 'https://demo.gigglin.tech' },
    ],
  },
  {
    name: 'marzneshin', driver: 'host', external: false, nets: ['host', 'marzneshin_default'],
    services: [
      { name: 'marzneshin-marzneshin-1', image: 'dawsh/marzneshin:latest', tech: 'marzneshin', role: 'app', status: 'running', uptime: '27д', restarts: 0, cpu: 0.8, mem: 581 },
      { name: 'marzneshin-marzneshin-db-1', image: 'mariadb:11', tech: 'mariadb', role: 'app', status: 'running', uptime: '27д', restarts: 0, cpu: 0.3, mem: 102 },
      { name: 'marznode-home', image: 'dawsh/marznode:latest', tech: 'Node', role: 'app', status: 'running', uptime: '27д', restarts: 0, cpu: 0.6, mem: 147 },
    ],
  },
  {
    name: 'my_server', driver: 'bridge', external: false, nets: [PROXY],
    services: [
      { name: 'landing', image: 'ghcr.io/gi99lin/portfolio:latest', tech: 'portfolio', role: 'app', status: 'running', uptime: '40д', restarts: 0, cpu: 0.2, mem: 11, url: 'https://ivanyakimkin.ru' },
      { name: 'nginx-proxy-manager', image: 'jc21/nginx-proxy-manager:latest', tech: 'nginx', role: 'gateway', status: 'running', uptime: '40д', restarts: 0, cpu: 0.6, mem: 227 },
      { name: 'nginx-proxy-manager-db', image: 'jc21/mariadb-aria:latest', tech: 'mariadb-aria', role: 'gateway', status: 'running', uptime: '40д', restarts: 0, cpu: 0.3, mem: 73 },
    ],
  },
  {
    name: 'nextcloud', driver: 'bridge', external: false, nets: [PROXY, 'nextcloud_nextcloud-net'],
    services: [
      { name: 'nextcloud', image: 'nextcloud:29-apache', tech: 'PHP', role: 'app', status: 'running', uptime: '30д', restarts: 0, cpu: 1.0, mem: 187, url: 'https://cloud.gigglin.tech' },
      { name: 'nextcloud-cron', image: 'nextcloud:29-apache', tech: 'PHP', role: 'worker', status: 'running', uptime: '30д', restarts: 0, cpu: 0.2, mem: 13 },
      { name: 'nextcloud-db', image: 'mariadb:11', tech: 'mariadb', role: 'app', status: 'running', uptime: '30д', restarts: 0, cpu: 0.6, mem: 379 },
      { name: 'nextcloud-redis', image: 'redis:7-alpine', tech: 'Redis', role: 'cache', status: 'running', uptime: '30д', restarts: 0, cpu: 0.2, mem: 7 },
    ],
  },
  {
    name: 'omniroute', driver: 'bridge', external: false, nets: [PROXY, 'omniroute_omniroute_network'],
    services: [
      { name: 'omniroute', image: 'ghcr.io/gi99lin/omniroute:latest', tech: 'Node', role: 'app', status: 'running', uptime: '14д', restarts: 0, cpu: 1.4, mem: 142, url: 'https://omniroute.gigglin.tech' },
    ],
  },
  {
    name: 'openclaw', driver: 'bridge', external: false, nets: [PROXY, 'openclaw_network'],
    services: [
      { name: 'browserless', image: 'ghcr.io/browserless/chromium:latest', tech: 'chromium', role: 'app', status: 'running', uptime: '11д', restarts: 0, cpu: 1.3, mem: 200 },
      { name: 'spawn-sanitizer', image: 'ghcr.io/gi99lin/spawn-sanitizer:latest', tech: 'Node', role: 'app', status: 'running', uptime: '11д', restarts: 0, cpu: 0.4, mem: 73 },
      { name: 'telegram-mcp', image: 'ghcr.io/gi99lin/openclaw-telegram-mcp:latest', tech: 'Node', role: 'app', status: 'running', uptime: '11д', restarts: 0, cpu: 0.5, mem: 99 },
    ],
  },
  {
    name: 'status-dashboard', driver: 'bridge', external: false, nets: [PROXY],
    services: [
      { name: 'status-dashboard-api', image: 'ghcr.io/gi99lin/status-dashboard-api:latest', tech: 'Node', role: 'app', status: 'running', uptime: '2д', restarts: 0, cpu: 0.5, mem: 44, url: 'https://dash.gigglin.tech' },
    ],
  },
  {
    name: 'status-dashboard-demo', driver: 'bridge', external: false, nets: [PROXY],
    services: [
      { name: 'status-dashboard-demo', image: 'ghcr.io/gi99lin/status-dashboard-web-demo:latest', tech: 'Nginx', role: 'app', status: 'running', uptime: '2д', restarts: 0, cpu: 0.2, mem: 18, url: 'https://infra.gigglin.tech' },
    ],
  },
  {
    name: 'syncthing', driver: 'bridge', external: false, nets: [PROXY],
    services: [
      { name: 'syncthing', image: 'syncthing/syncthing:latest', tech: 'syncthing', role: 'app', status: 'running', uptime: '34д', restarts: 1, cpu: 0.4, mem: 72 },
    ],
  },
  {
    name: 'media-relay', driver: 'bridge', external: false, nets: ['media-relay_default'],
    services: [
      { name: 'media-relay-cli', image: 'ghcr.io/acme/media-relay:latest', tech: 'C++', role: 'app', status: 'running', uptime: '7д', restarts: 0, cpu: 0.3, mem: 58 },
    ],
  },
  {
    name: 'watchtower', driver: 'bridge', external: false, nets: ['watchtower_default'],
    services: [
      { name: 'watchtower', image: 'nickfedor/watchtower:latest', tech: 'watchtower', role: 'app', status: 'running', uptime: '2д', restarts: 0, cpu: 0.1, mem: 13 },
    ],
  },
];

const STANDALONE: StandaloneNode[] = [
  { name: 'nginx', id: 'nginx', role: 'gateway', status: 'running', tech: 'Nginx', cpu: 0.6 },
  { name: 'Netdata', id: 'netdata', role: 'monitor', status: 'running', tech: 'Netdata' },
  { name: 'внешние LLM', id: 'external-llm', role: 'external', status: 'running', reachable: true },
  { name: 'work-vm', id: 'work-vm', role: 'vm', status: 'unmonitored', tech: 'RDP', via: 'guacamole' },
];

function telemetry(): Telemetry {
  const now = Date.now();
  const points = 60;
  const make = (base: number, amp: number) =>
    Array.from({ length: points }, (_, i) => ({
      t: now - (points - i) * 60_000,
      value: Math.max(0, Math.round((base + Math.sin(i / 6) * amp + (Math.random() - 0.5) * amp) * 10) / 10),
    }));
  return { cpu: make(18, 8), ram: make(40, 6), net: make(1.4, 0.8) };
}

function jitterServices(services: NetworkGroup['services']) {
  return services.map((s) => ({
    ...s,
    cpu: s.cpu === undefined ? undefined : jit(s.cpu, s.cpu * 0.6),
    mem: s.mem === undefined ? undefined : jit(s.mem, Math.max(2, s.mem * 0.1), 1),
  }));
}

const TOTAL = NETWORKS.reduce((n, net) => n + net.services.length, 0) + 1; // + gateway

function demoGroups(): ServiceGroup[] {
  return NETWORKS.map((n) => ({
    name: n.name,
    services: jitterServices(n.services),
    networks: n.nets,
    driver: n.driver,
  }));
}

// Mirrors api/src/infraTopology.js edge logic: nginx → publicly-routed cards,
// Netdata → every card, plus omniroute → external LLM and guacamole → VM.
function demoEdges(groups: ServiceGroup[]): TopologyEdge[] {
  const routed = groups.filter((g) => g.services.some((s) => s.url));
  return [
    { from: 'internet', to: 'nginx', type: 'http' },
    ...routed.map((g) => ({ from: 'nginx', to: g.name, type: 'http' })),
    { from: 'guacamole', to: 'work-vm', type: 'rdp' },
    { from: 'omniroute', to: 'external-llm', type: 'llm' },
    ...groups.map((g) => ({ from: 'Netdata', to: g.name, type: 'monitor' })),
  ];
}

export function demoTopology(): Topology {
  const groups = demoGroups();
  return {
    host: {
      name: 'gigglin-server',
      uptime: '40д',
      cpu: jit(18, 8),
      ram: jit(40, 6),
      disk: 61,
      net: jit(1.4, 0.8),
      vcpu: 12,
      ram_total: 30,
      os: 'Ubuntu 24.04.4 LTS (Noble Numbat)',
      containers: { total: TOTAL, running: TOTAL - 2 },
    },
    telemetry: telemetry(),
    networks: NETWORKS.map((n) => ({ ...n, services: jitterServices(n.services) })),
    groups,
    standalone: STANDALONE,
    edges: demoEdges(groups),
  };
}

export function demoContainers(): FlatContainer[] {
  return NETWORKS.flatMap((n) =>
    jitterServices(n.services).map((s) => ({ ...s, networks: n.nets })),
  );
}

export function demoNetworks(): FlatNetwork[] {
  const names = [...new Set(NETWORKS.flatMap((n) => n.nets))];
  return names.map((net) => {
    const members = NETWORKS.filter((n) => n.nets.includes(net));
    return {
      name: net,
      driver: net === 'host' ? 'host' : 'bridge',
      external: net === PROXY,
      containers: members.reduce((sum, n) => sum + n.services.length, 0),
      members: members.flatMap((n) => n.services.map((s) => s.name)),
    };
  });
}

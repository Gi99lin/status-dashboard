import { getGuacConnections } from './guacamole.js';
import { readNginxRoutes } from './nginxRoutes.js';

export function emptyTopology() {
  return {
    host: {},
    telemetry: { cpu: [], ram: [], net: [] },
    networks: [],
    groups: [],
    standalone: [],
    edges: [],
  };
}

function serviceRole(container) {
  const explicit = container.labels?.['dashboard.role'];
  if (explicit) return explicit;
  const name = `${container.name || ''} ${container.image || ''}`.toLowerCase();
  if (name.includes('postgres') || name.includes('pg')) return 'db';
  if (name.includes('redis')) return 'cache';
  if (name.includes('mongo') || name.includes('meili')) return 'data';
  if (name.includes('collector') || name.includes('cron')) return 'worker';
  if (name.includes('nginx')) return 'gateway';
  return 'app';
}

function techFor(container) {
  const label = container.labels?.['dashboard.tech'];
  if (label) return label;
  const image = container.image || '';
  const lower = image.toLowerCase();
  if (lower.includes('postgres')) return 'pg';
  if (lower.includes('redis')) return 'Redis';
  if (lower.includes('nginx')) return 'nginx';
  if (lower.includes('guacamole')) return 'Java';
  if (lower.includes('node')) return 'Node';
  return image.split(':')[0].split('/').pop() || 'svc';
}

// Group key for the map's service cards: containers that belong to the same
// docker-compose project (or share an explicit dashboard.group label) form
// one card, regardless of which docker network(s) they happen to share.
// Containers with neither become a single-container group of their own, so
// every container always lands in exactly one card.
function projectFor(container) {
  return container.labels?.['com.docker.compose.project']
    || container.labels?.['dashboard.group']
    || container.name;
}

function buildServiceGroups(containers, routes) {
  const names = [...new Set(containers.map(projectFor))].sort((a, b) => a.localeCompare(b));

  return names.map((name) => {
    const members = containers
      .filter((container) => projectFor(container) === name)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const memberNetworks = new Set(members.flatMap((container) => container.networks || []));

    return {
      name,
      services: members.map((container) => normalizeService(container, routes)),
      networks: [...memberNetworks].sort((a, b) => a.localeCompare(b)),
      driver: memberNetworks.has('host') ? 'host' : 'bridge',
    };
  });
}

function routeFor(routes, serviceName) {
  // Exact (case-insensitive) match only: an nginx upstream host resolves to
  // one specific container/alias. Substring matching wrongly handed public
  // URLs to sibling containers (e.g. nextcloud-db inheriting nextcloud's URL).
  const clean = String(serviceName || '').toLowerCase();
  return routes.find((route) => String(route.upstreamHost || '').toLowerCase() === clean);
}

function normalizeService(container, routes) {
  const route = routeFor(routes, container.name);
  return {
    name: container.labels?.['dashboard.name'] || container.name,
    image: container.image,
    tech: techFor(container),
    purpose: container.labels?.['dashboard.purpose'] || container.labels?.['dashboard.group'] || '',
    status: container.state || container.status || 'unknown',
    uptime: container.uptime || container.status || '',
    restarts: container.restarts ?? 0,
    cpu: Math.round((container.cpu || 0) * 10) / 10,
    mem: Math.round((container.mem ?? container.memMB ?? 0) * 10) / 10,
    url: route?.url,
    role: serviceRole(container),
  };
}

export function assembleTopology({
  containers = [],
  networks = [],
  routes = [],
  vms = [],
  staticVm = null,
  telemetry = { cpu: [], ram: [], net: [] },
  host = {},
} = {}) {
  const networkInfo = new Map(networks.map((network) => [network.name, network]));

  const networkNames = [...new Set([
    ...networks.map((network) => network.name),
    ...containers.flatMap((container) => container.networks || []),
  ])].filter(Boolean).sort((a, b) => a.localeCompare(b));

  const grouped = networkNames.map((name) => {
    const info = networkInfo.get(name) || {};
    return {
      name,
      driver: info.driver || (name === 'host' ? 'host' : 'bridge'),
      external: info.external ?? false,
      services: containers
        .filter((container) => (container.networks || []).includes(name))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map((container) => normalizeService(container, routes)),
    };
  }).filter((network) => network.services.length);

  // Map cards: one per docker-compose project / standalone container,
  // independent of which docker network(s) they share.
  const groups = buildServiceGroups(containers, routes);

  const standalone = [
    { name: 'nginx', role: 'gateway', status: 'running' },
    { name: 'внешние LLM', id: 'external-llm', role: 'external', status: 'running' },
    { name: 'Netdata', role: 'monitor', status: 'running' },
    ...vms.map((vm) => ({
      name: vm.name,
      role: 'vm',
      status: vm.reachable === false ? 'down' : 'running',
      tech: (vm.protocol || 'vnc').toUpperCase(),
      via: 'guacamole',
      reachable: vm.reachable !== false,
      open: vm.open || process.env.GUAC_URL || '',
    })),
    // Manual fallback when there's no Guacamole account to query live status
    // for (see VM_NAME/VM_TECH/VM_URL in collectTopology) — shown as a static
    // tile with an "unmonitored" dot instead of a real up/down indicator.
    ...(staticVm ? [{
      name: staticVm.name,
      role: 'vm',
      status: 'unmonitored',
      tech: (staticVm.tech || 'RDP').toUpperCase(),
      via: 'guacamole',
      open: staticVm.open || process.env.GUAC_URL || '',
    }] : []),
  ];

  const edges = [
    { from: 'internet', to: 'nginx', type: 'http' },
    // nginx only proxies services that have a public URL (an nginx route);
    // internal-only groups (DBs, workers) aren't behind it, so don't draw
    // a traffic edge for them.
    ...groups
      .filter((group) => group.services.some((service) => service.url))
      .map((group) => ({ from: 'nginx', to: group.name, type: 'http' })),
    ...vms.map((vm) => ({ from: 'guacamole', to: vm.name, type: vm.protocol || 'vnc' })),
    ...(staticVm ? [{ from: 'guacamole', to: staticVm.name, type: 'rdp' }] : []),
    ...groups.map((group) => ({ from: 'Netdata', to: group.name, type: 'monitor' })),
  ];

  const hasOmni = containers.some((container) => /omni/i.test(container.name || ''));
  if (hasOmni) edges.push({ from: 'omniroute', to: 'external-llm', type: 'llm' });

  return {
    host: {
      name: host.name || 'homelab',
      uptime: host.uptime || '',
      cpu: host.cpu ?? 0,
      ram: host.ram ?? 0,
      disk: host.disk ?? 0,
      net: host.net ?? 0,
      vcpu: host.vcpu,
      ram_total: host.ram_total,
      os: host.os || '',
      containers: host.containers || {
        total: containers.length,
        running: containers.filter((container) => container.state === 'running').length,
      },
    },
    telemetry,
    networks: grouped,
    groups,
    standalone,
    edges,
  };
}

// Flat projection for the "Контейнеры" section: one row per container,
// merging the per-network entries produced by assembleTopology().
export function flattenContainers(topology) {
  const byName = new Map();

  for (const network of topology.networks || []) {
    for (const service of network.services) {
      if (!byName.has(service.name)) {
        byName.set(service.name, { ...service, networks: [] });
      }
      byName.get(service.name).networks.push(network.name);
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Flat projection for the "Сети" section.
export function flattenNetworks(topology) {
  return (topology.networks || []).map((network) => ({
    name: network.name,
    driver: network.driver,
    external: network.external,
    containers: network.services.length,
    members: network.services.map((service) => service.name),
  }));
}

function netdataSeries(chart, mapRow) {
  if (!chart?.data?.length) return [];
  const labels = chart.labels || [];
  return chart.data
    .map((row) => mapRow(row, labels))
    .filter(Boolean)
    .sort((a, b) => (Number(a.t) || 0) - (Number(b.t) || 0));
}

function cpuValue(row, labels) {
  const idleIndex = labels.indexOf('idle');
  if (idleIndex >= 0) {
    return Math.max(0, Math.min(100, 100 - (Number(row[idleIndex]) || 0)));
  }

  const active = labels.reduce((sum, label, index) => {
    if (index === 0 || label === 'time' || label === 'idle') return sum;
    return sum + Math.max(0, Number(row[index]) || 0);
  }, 0);
  return Math.max(0, Math.min(100, Math.round(active * 10) / 10));
}

function displayHostName(raw) {
  const value = String(raw || '').trim();
  if (!value || /^[a-f0-9]{12,64}$/i.test(value)) return 'homelab';
  return value;
}

async function collectTelemetry(getNetdataChart, minutes) {
  if (!getNetdataChart) return { host: {}, telemetry: { cpu: [], ram: [], net: [] } };
  const after = -minutes * 60;
  const points = Math.min(minutes, 180);
  try {
    const [cpuChart, ramChart, netChart, diskChart] = await Promise.all([
      getNetdataChart('system.cpu', after, points),
      getNetdataChart('system.ram', after, points),
      getNetdataChart('system.net', after, points),
      getNetdataChart('disk_space._', after, 1),
    ]);

    const cpu = netdataSeries(cpuChart, (row, labels) => {
      return { t: row[0], value: cpuValue(row, labels) };
    });
    const ram = netdataSeries(ramChart, (row, labels) => {
      const usedIndex = labels.indexOf('used');
      const used = usedIndex >= 0 ? Math.abs(row[usedIndex] || 0) : 0;
      const total = labels.reduce((sum, label, index) => index === 0 ? sum : sum + Math.abs(row[index] || 0), 0);
      return { t: row[0], value: total ? Math.round((used / total) * 100) : 0 };
    });
    const net = netdataSeries(netChart, (row, labels) => {
      const value = labels.reduce((sum, label, index) => index === 0 ? sum : sum + Math.abs(row[index] || 0), 0);
      return { t: row[0], value: Math.round(value) };
    });
    const disk = diskChart?.data?.length ? (() => {
      const labels = diskChart.labels || [];
      const row = diskChart.data[diskChart.data.length - 1];
      const used = Math.abs(row[labels.indexOf('used')] || 0);
      const avail = Math.abs(row[labels.indexOf('avail')] || 0);
      return used + avail ? Math.round((used / (used + avail)) * 100) : 0;
    })() : 0;

    return {
      host: {
        cpu: cpu.at(-1)?.value ?? 0,
        ram: ram.at(-1)?.value ?? 0,
        disk,
        net: net.at(-1)?.value ?? 0,
      },
      telemetry: { cpu, ram, net },
    };
  } catch {
    return { host: {}, telemetry: { cpu: [], ram: [], net: [] } };
  }
}

// Maps Netdata's GET /api/v1/info to the host hardware fields the HostCard
// shows (vCPU, RAM total, OS). Returns {} (→ "—" in the UI) if unavailable.
async function collectHostInfo(getNetdataInfo) {
  if (!getNetdataInfo) return {};
  try {
    const info = await getNetdataInfo();
    if (!info) return {};
    return {
      vcpu: info.cores_total,
      ram_total: info.ram_total ? Math.round(info.ram_total / (1024 ** 3)) : undefined,
      os: [info.os_name, info.os_version].filter(Boolean).join(' ') || undefined,
    };
  } catch {
    return {};
  }
}

async function dockerStats(docker, id, state) {
  if (!docker || state !== 'running') return { cpu: 0, mem: 0 };
  try {
    const stats = await docker.getContainer(id).stats({ stream: false });
    const cpuDelta = (stats.cpu_stats?.cpu_usage?.total_usage || 0) - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
    const systemDelta = (stats.cpu_stats?.system_cpu_usage || 0) - (stats.precpu_stats?.system_cpu_usage || 0);
    const cpus = stats.cpu_stats?.online_cpus || 1;
    const cpu = systemDelta > 0 && cpuDelta > 0 ? (cpuDelta / systemDelta) * cpus * 100 : 0;
    const usage = stats.memory_stats?.usage || 0;
    const cache = stats.memory_stats?.stats?.cache || stats.memory_stats?.stats?.inactive_file || 0;
    return { cpu, mem: Math.max(0, (usage - cache) / (1024 * 1024)) };
  } catch {
    return { cpu: 0, mem: 0 };
  }
}

async function collectDocker(docker) {
  if (!docker) return { containers: [], networks: [] };
  try {
    const [rawContainers, rawNetworks] = await Promise.all([
      docker.listContainers({ all: true }),
      docker.listNetworks().catch(() => []),
    ]);
    const containers = await Promise.all(rawContainers.map(async (container) => {
      let inspect = {};
      try {
        inspect = await docker.getContainer(container.Id).inspect();
      } catch {
        inspect = {};
      }
      const name = (container.Names?.[0] || inspect.Name || container.Id || '').replace(/^\//, '');
      const networkMode = inspect.HostConfig?.NetworkMode;
      const networks = Object.keys(inspect.NetworkSettings?.Networks || container.NetworkSettings?.Networks || {});
      if (!networks.length && networkMode === 'host') networks.push('host');
      const stats = await dockerStats(docker, container.Id, container.State);
      return {
        id: container.Id,
        name,
        image: container.Image,
        state: container.State,
        status: container.Status,
        labels: container.Labels || inspect.Config?.Labels || {},
        networks,
        restarts: inspect.RestartCount || 0,
        uptime: container.Status,
        ...stats,
      };
    }));
    return {
      containers,
      networks: rawNetworks.map((network) => ({
        name: network.Name,
        driver: network.Driver,
        external: !network.Labels?.['com.docker.compose.project'],
      })).filter((network) => network.name),
    };
  } catch {
    return { containers: [], networks: [] };
  }
}

export async function collectTopology({ docker, getNetdataChart, getNetdataInfo, minutes = 60 } = {}) {
  try {
    const [{ containers, networks }, routes, vms, telemetryData, hostInfo] = await Promise.all([
      collectDocker(docker),
      Promise.resolve(readNginxRoutes()),
      getGuacConnections(),
      collectTelemetry(getNetdataChart, minutes),
      collectHostInfo(getNetdataInfo),
    ]);

    const staticVm = process.env.VM_NAME ? {
      name: process.env.VM_NAME,
      tech: process.env.VM_TECH,
      open: process.env.VM_URL,
    } : null;

    return assembleTopology({
      containers,
      networks,
      routes,
      vms,
      staticVm,
      telemetry: telemetryData.telemetry,
      host: {
        name: displayHostName(process.env.HOST_DISPLAY_NAME || process.env.HOSTNAME),
        ...telemetryData.host,
        ...hostInfo,
      },
    });
  } catch {
    return emptyTopology();
  }
}

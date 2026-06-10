import type { Edge, Node } from '@xyflow/react';
import type { Topology } from '../../types';

const COL_WIDTH = 300;
const COL_GAP = 40;
const ROW_HEIGHT = 240;
const GRID_X = 360;
const GRID_COLS = 3;

const EDGE_KIND: Record<string, string> = {
  http: 'flow',
  monitor: 'mon',
  llm: 'flow',
};

function findNetworkByServicePattern(topology: Topology, pattern: RegExp): string | null {
  for (const network of topology.networks) {
    if (network.services.some((service) => pattern.test(service.name) || pattern.test(service.tech || ''))) {
      return network.name;
    }
  }
  return null;
}

export function buildGraph(topology: Topology): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const nginx = topology.standalone.find((node) => node.role === 'gateway');
  const netdata = topology.standalone.find((node) => node.role === 'monitor');
  const externalLlm = topology.standalone.find((node) => node.id === 'external-llm');
  const vms = topology.standalone.filter((node) => node.role === 'vm');

  const urlCount = topology.networks
    .flatMap((network) => network.services)
    .filter((service) => service.url).length;

  nodes.push({
    id: 'internet',
    type: 'standalone',
    position: { x: 20, y: 240 },
    data: { node: { name: 'Интернет', role: 'external', status: 'running' }, icon: '🌐' },
    draggable: true,
  });

  if (nginx) {
    nodes.push({
      id: 'nginx',
      type: 'standalone',
      position: { x: 170, y: 240 },
      data: { node: nginx, tagText: 'proxy', meta: `NPM · TLS · ${urlCount} URL` },
      draggable: true,
    });
  }

  topology.networks.forEach((network, index) => {
    nodes.push({
      id: `net:${network.name}`,
      type: 'network',
      position: {
        x: GRID_X + (index % GRID_COLS) * (COL_WIDTH + COL_GAP),
        y: 10 + Math.floor(index / GRID_COLS) * ROW_HEIGHT,
      },
      data: { network },
      draggable: true,
      style: { width: 268 },
    });
  });

  const rightX = GRID_X + GRID_COLS * (COL_WIDTH + COL_GAP) + 40;
  let rightY = 60;

  if (externalLlm) {
    nodes.push({
      id: 'external-llm',
      type: 'standalone',
      position: { x: rightX, y: rightY },
      data: { node: externalLlm, icon: '☁', meta: 'через OmniRoute' },
      draggable: true,
    });
    rightY += 160;
  }

  if (netdata) {
    nodes.push({
      id: 'netdata',
      type: 'standalone',
      position: { x: rightX, y: rightY },
      data: { node: netdata, tagText: 'obs', meta: 'наблюдает за всеми', metaColor: 'var(--purple)' },
      draggable: true,
    });
    rightY += 160;
  }

  vms.forEach((vm) => {
    nodes.push({
      id: `vm:${vm.name}`,
      type: 'standalone',
      position: { x: rightX - 120, y: rightY },
      data: { node: vm, icon: '🖥️', tagText: vm.tech, meta: 'через Guacamole', metaColor: 'var(--blue)' },
      draggable: true,
    });
    rightY += 160;
  });

  function resolveId(rawId: string): string | null {
    if (rawId === 'internet') return 'internet';
    if (rawId === 'nginx') return nginx ? 'nginx' : null;
    if (rawId === 'Netdata') return netdata ? 'netdata' : null;
    if (rawId === 'external-llm') return externalLlm ? 'external-llm' : null;
    if (rawId === 'guacamole') {
      const name = findNetworkByServicePattern(topology, /guacamole/i);
      return name ? `net:${name}` : null;
    }
    if (rawId === 'omniroute') {
      const name = findNetworkByServicePattern(topology, /omni/i);
      return name ? `net:${name}` : null;
    }
    if (topology.networks.some((network) => network.name === rawId)) return `net:${rawId}`;
    if (vms.some((vm) => vm.name === rawId)) return `vm:${rawId}`;
    return null;
  }

  topology.edges.forEach((edge, index) => {
    const source = resolveId(edge.from);
    const target = resolveId(edge.to);
    if (!source || !target || source === target) return;

    const kind = EDGE_KIND[edge.type] || 'remote';
    const isMon = kind === 'mon';

    edges.push({
      id: `edge-${index}-${edge.from}-${edge.to}`,
      source,
      target,
      sourceHandle: isMon ? 'source-left' : 'source-right',
      targetHandle: isMon ? 'target-right' : 'target-left',
      type: 'topo',
      data: { kind },
    });
  });

  return { nodes, edges };
}

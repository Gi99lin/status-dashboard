import type { Edge, Node } from '@xyflow/react';
import type { ServiceGroup, Topology } from '../../types';

const CARD_W = 250;
const GAP = 16;
const BOX_PAD = 18;
const BOX_LABEL_H = 32;
const MAIN_X = 360;
const COL_MAX = 4;

// Network membership is shown by containment (boxes), so 'network' edges are
// dropped here; the rest keep their colours.
const EDGE_KIND: Record<string, string> = {
  http: 'flow',
  monitor: 'mon',
  llm: 'flow',
};

function findGroupByServicePattern(topology: Topology, pattern: RegExp): string | null {
  for (const group of topology.groups) {
    if (group.services.some((service) => pattern.test(service.name) || pattern.test(service.tech || ''))) {
      return group.name;
    }
  }
  return null;
}

// Estimate a card's rendered height from how ServiceGroupNode lays out: a
// header + network tags + the primary container, then the rest in a 2-up
// wrapping row. Used so masonry packing never overlaps cards.
function cardHeight(group: ServiceGroup): number {
  const restRows = Math.ceil(Math.max(0, group.services.length - 1) / 2);
  // header + up-to-two-row network tags + primary, then 2-up rest rows.
  // Names no longer wrap (CSS ellipsis), so this is a reliable upper bound.
  return 128 + restRows * 54;
}

// Place cards into `cols` columns, dropping each into the currently-shortest
// column (masonry) so variable-height cards pack tightly without overlapping.
function masonry(cards: ServiceGroup[], cols: number, startX: number, startY: number) {
  const colY = Array.from({ length: cols }, () => startY);
  const placed = cards.map((card) => {
    let c = 0;
    for (let k = 1; k < cols; k += 1) if (colY[k] < colY[c]) c = k;
    const x = startX + c * (CARD_W + GAP);
    const y = colY[c];
    colY[c] += cardHeight(card) + GAP;
    return { card, x, y };
  });
  const width = cols * CARD_W + (cols - 1) * GAP;
  const height = Math.max(...colY, startY) - startY - GAP;
  return { placed, width, height };
}

export function buildGraph(topology: Topology): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const nginx = topology.standalone.find((node) => node.role === 'gateway');
  const netdata = topology.standalone.find((node) => node.role === 'monitor');
  const externalLlm = topology.standalone.find((node) => node.id === 'external-llm');
  const vms = topology.standalone.filter((node) => node.role === 'vm');

  const urlCount = topology.groups
    .flatMap((group) => group.services)
    .filter((service) => service.url).length;

  // Networks shared by 2+ cards become boxes; single-card networks stay tags.
  const netCount = new Map<string, number>();
  for (const group of topology.groups) {
    for (const network of group.networks) {
      if (network !== 'host') netCount.set(network, (netCount.get(network) ?? 0) + 1);
    }
  }
  const boxNets = [...netCount.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([network]) => network);

  // Each card goes in the largest shared-network box it belongs to.
  const boxMembers = new Map<string, ServiceGroup[]>(boxNets.map((n) => [n, []]));
  const freeGroups: ServiceGroup[] = [];
  for (const group of topology.groups) {
    const box = boxNets.find((network) => group.networks.includes(network));
    if (box) boxMembers.get(box)!.push(group);
    else freeGroups.push(group);
  }

  const groupNode = (group: ServiceGroup, x: number, y: number): Node => ({
    id: `group:${group.name}`,
    type: 'serviceGroup',
    position: { x, y },
    data: { group },
    draggable: true,
    style: { width: CARD_W },
    zIndex: 1,
  });

  let y = 20;
  let maxW = CARD_W;

  for (const network of boxNets) {
    const members = boxMembers.get(network)!;
    if (!members.length) continue;
    const cols = Math.min(COL_MAX, members.length);
    const grid = masonry(members, cols, MAIN_X + BOX_PAD, y + BOX_LABEL_H);
    const boxW = grid.width + BOX_PAD * 2;
    const boxH = grid.height + BOX_LABEL_H + BOX_PAD;

    nodes.push({
      id: `netbox:${network}`,
      type: 'networkBox',
      position: { x: MAIN_X, y },
      data: { label: network, count: members.length },
      style: { width: boxW, height: boxH },
      draggable: false,
      selectable: false,
      zIndex: 0,
    });
    for (const { card, x, y: cy } of grid.placed) nodes.push(groupNode(card, x, cy));

    maxW = Math.max(maxW, boxW);
    y += boxH + 40;
  }

  if (freeGroups.length) {
    const cols = Math.min(COL_MAX, freeGroups.length);
    const grid = masonry(freeGroups, cols, MAIN_X, y);
    for (const { card, x, y: cy } of grid.placed) nodes.push(groupNode(card, x, cy));
    maxW = Math.max(maxW, grid.width);
    y += grid.height;
  }

  const midY = Math.max(240, Math.round(y / 2));
  nodes.push({
    id: 'internet',
    type: 'standalone',
    position: { x: 20, y: midY },
    data: { node: { name: 'Интернет', role: 'external', status: 'running' }, icon: '🌐' },
    draggable: true,
  });

  if (nginx) {
    nodes.push({
      id: 'nginx',
      type: 'standalone',
      position: { x: 180, y: midY },
      data: { node: nginx, tagText: 'proxy', meta: `NPM · TLS · ${urlCount} URL` },
      draggable: true,
    });
  }

  const rightX = MAIN_X + maxW + 60;
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
      position: { x: rightX, y: rightY },
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
      const name = findGroupByServicePattern(topology, /guacamole/i);
      return name ? `group:${name}` : null;
    }
    if (rawId === 'omniroute') {
      const name = findGroupByServicePattern(topology, /omni/i);
      return name ? `group:${name}` : null;
    }
    if (topology.groups.some((group) => group.name === rawId)) return `group:${rawId}`;
    if (vms.some((vm) => vm.name === rawId)) return `vm:${rawId}`;
    return null;
  }

  topology.edges.forEach((edge, index) => {
    if (edge.type === 'network') return; // shown as boxes, not lines
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
      // React Flow draws edges beneath nodes by default; elevate so connectors
      // crossing the card grid stay visible.
      zIndex: 10,
    });
  });

  return { nodes, edges };
}

import { useEffect } from 'react';
import { ReactFlow, Controls, MiniMap, useEdgesState, useNodesState, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Topology } from '../../types';
import { nodeTypes, edgeTypes } from './registry';
import { buildGraph } from './layout';
import { DEMO } from '../../lib/demo';

const POSITIONS_KEY = 'status-map.node-positions';

function loadPositions(): Record<string, { x: number; y: number }> {
  try {
    return JSON.parse(localStorage.getItem(POSITIONS_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePositions(nodes: Node[]) {
  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) positions[node.id] = node.position;
  try {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  } catch {
    /* ignore quota/availability errors */
  }
}

export function TopologyMap({ topology }: { topology: Topology }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<ReturnType<typeof buildGraph>['nodes'][number]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ReturnType<typeof buildGraph>['edges'][number]>([]);
  const ready = topology.networks.length > 0 || topology.standalone.length > 0;

  useEffect(() => {
    const next = buildGraph(topology);
    // Demo always uses the clean auto-layout — never restore a visitor's drags.
    const saved = DEMO ? {} : loadPositions();
    setNodes((prev) => {
      const prevById = new Map(prev.map((node) => [node.id, node]));
      return next.nodes.map((node) => {
        const old = prevById.get(node.id);
        if (old) return { ...node, position: old.position };
        const savedPos = saved[node.id];
        return savedPos ? { ...node, position: savedPos } : node;
      });
    });
    setEdges(next.edges);
  }, [topology, setNodes, setEdges]);

  function handleNodesChange(changes: Parameters<typeof onNodesChange>[0]) {
    onNodesChange(changes);
    if (!DEMO && changes.some((change) => change.type === 'position' && change.dragging === false)) {
      setNodes((current) => {
        savePositions(current);
        return current;
      });
    }
  }

  if (!ready) {
    return (
      <div className="topo topo-loading">
        <span className="lbl">загрузка топологии…</span>
      </div>
    );
  }

  return (
    <div className="topo">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.15}
        maxZoom={1.5}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap pannable zoomable className="topo-minimap" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

import { NetworkNode, StandaloneNode } from './nodes';
import { TopoEdge } from './edges';

export const nodeTypes = {
  network: NetworkNode,
  standalone: StandaloneNode,
};

export const edgeTypes = {
  topo: TopoEdge,
};

import { ServiceGroupNode, StandaloneNode } from './nodes';
import { TopoEdge } from './edges';

export const nodeTypes = {
  serviceGroup: ServiceGroupNode,
  standalone: StandaloneNode,
};

export const edgeTypes = {
  topo: TopoEdge,
};

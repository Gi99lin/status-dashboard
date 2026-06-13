import { NetworkBoxNode, ServiceGroupNode, StandaloneNode } from './nodes';
import { TopoEdge } from './edges';

export const nodeTypes = {
  serviceGroup: ServiceGroupNode,
  standalone: StandaloneNode,
  networkBox: NetworkBoxNode,
};

export const edgeTypes = {
  topo: TopoEdge,
};

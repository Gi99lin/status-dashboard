export interface TelemetryPoint {
  t: number;
  value: number;
}

export interface Telemetry {
  cpu: TelemetryPoint[];
  ram: TelemetryPoint[];
  net: TelemetryPoint[];
}

export interface Host {
  name: string;
  uptime: string;
  cpu: number;
  ram: number;
  disk: number;
  net: number;
  vcpu?: number;
  ram_total?: number;
  os: string;
  containers: { total: number; running: number };
}

export interface Service {
  name: string;
  image?: string;
  tech?: string;
  purpose?: string;
  status: string;
  uptime?: string;
  restarts?: number;
  cpu?: number;
  mem?: number;
  url?: string;
  role: string;
}

export interface NetworkGroup {
  name: string;
  driver: string;
  external: boolean;
  services: Service[];
}

// A map card: containers belonging to the same docker-compose project (or
// sharing an explicit dashboard.group label), independent of which docker
// network(s) they happen to share.
export interface ServiceGroup {
  name: string;
  services: Service[];
  networks: string[];
  driver: string;
}

export interface StandaloneNode {
  name: string;
  id?: string;
  role: string;
  status: string;
  tech?: string;
  via?: string;
  reachable?: boolean;
  open?: string;
  cpu?: number;
}

export interface TopologyEdge {
  from: string;
  to: string;
  type: string;
}

export interface Topology {
  host: Host;
  telemetry: Telemetry;
  networks: NetworkGroup[];
  groups: ServiceGroup[];
  standalone: StandaloneNode[];
  edges: TopologyEdge[];
}

export interface FlatContainer extends Service {
  networks: string[];
}

export interface FlatNetwork {
  name: string;
  driver: string;
  external: boolean;
  containers: number;
  members: string[];
}

export function emptyTopology(): Topology {
  return {
    host: {
      name: 'homelab',
      uptime: '',
      cpu: 0,
      ram: 0,
      disk: 0,
      net: 0,
      os: '',
      containers: { total: 0, running: 0 },
    },
    telemetry: { cpu: [], ram: [], net: [] },
    networks: [],
    groups: [],
    standalone: [],
    edges: [],
  };
}

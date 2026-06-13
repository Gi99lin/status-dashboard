import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CSSProperties } from 'react';
import type { ServiceGroup, Service, StandaloneNode as StandaloneNodeData } from '../../types';
import { statusDot, vitalColor } from './statusDot';

const HANDLE_STYLE: CSSProperties = { opacity: 0, width: 1, height: 1, border: 'none', background: 'transparent' };

function Handles() {
  return (
    <>
      <Handle id="target-left" type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Handle id="target-top" type="target" position={Position.Top} style={HANDLE_STYLE} />
      <Handle id="target-right" type="target" position={Position.Right} style={HANDLE_STYLE} />
      <Handle id="target-bottom" type="target" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle id="source-left" type="source" position={Position.Left} style={HANDLE_STYLE} />
      <Handle id="source-top" type="source" position={Position.Top} style={HANDLE_STYLE} />
      <Handle id="source-right" type="source" position={Position.Right} style={HANDLE_STYLE} />
      <Handle id="source-bottom" type="source" position={Position.Bottom} style={HANDLE_STYLE} />
    </>
  );
}

export function NetworkBoxNode({ data }: NodeProps & { data: { label: string; count: number } }) {
  return (
    <div className="netbox">
      <span className="netbox-label">
        <span className="netbox-kind">NET</span>
        {data.label}
        <span className="netbox-count">{data.count}</span>
      </span>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <span className="ring2" style={{ '--p': pct, '--gc': vitalColor(pct) } as CSSProperties}>
      <span>{pct}</span>
    </span>
  );
}

function pickPrimary(services: Service[]): Service | undefined {
  return services.find((s) => s.role === 'app' || s.role === 'gateway') || services[0];
}

export function ServiceGroupNode({ data }: NodeProps & { data: { group: ServiceGroup } }) {
  const { group } = data;
  const primary = pickPrimary(group.services);
  const rest = group.services.filter((s) => s !== primary);
  const isHost = group.driver === 'host';
  const label = isHost && primary ? `host · ${primary.name}` : group.name;

  return (
    <div className={`net${isHost ? ' host-net' : ''}`}>
      <Handles />
      <span className="nlabel">
        <span className="nkind">SVC</span>
        {label}
      </span>
      {group.networks.length > 0 && (
        <div className="nettags">
          {group.networks.map((net) => (
            <span className="nettag" key={net}>{net}</span>
          ))}
        </div>
      )}
      {primary && (
        <div className="inode app">
          <div className="ih">
            <span className={`dot ${statusDot(primary.status)}${statusDot(primary.status) === 'up' ? ' pulse' : ''}`} />
            <span className="inm">{primary.name}</span>
            {primary.tech && <span className="itt">{primary.tech}</span>}
          </div>
          <div className="im">
            <Ring value={primary.cpu ?? 0} />
            {Math.round(primary.mem ?? 0)}MB
            {primary.url && (
              <a className="open" href={primary.url} target="_blank" rel="noreferrer">↗ открыть</a>
            )}
          </div>
        </div>
      )}
      {rest.length > 0 && (
        <div className="datarow">
          {rest.map((service) => (
            <div className="inode" key={service.name}>
              <div className="ih">
                <span className={`dot ${statusDot(service.status)}`} />
                <span className="inm">{service.name}</span>
              </div>
              <div className="im">{Math.round(service.mem ?? 0)}MB</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StandaloneNode({ data }: NodeProps & { data: { node: StandaloneNodeData; icon?: string; tagText?: string; meta?: string; metaColor?: string } }) {
  const { node, icon, tagText, meta, metaColor } = data;
  const dot = statusDot(node.status);
  const ext = node.role === 'external';

  return (
    <div className={`tnode${ext ? ' ext' : ''}`}>
      <Handles />
      <div className="th">
        <span className={`dot ${dot}${dot === 'up' && !ext ? ' pulse' : ''}`} />
        <span className="tn">{icon ? `${icon} ${node.name}` : node.name}</span>
        {tagText && <span className="tt">{tagText}</span>}
      </div>
      {(meta || node.role === 'gateway') && (
        <div className="tm" style={metaColor ? { color: metaColor } : undefined}>
          {node.role === 'gateway' && <Ring value={node.cpu ?? 0} />}
          {meta}
          {node.open && (
            <a className="open" href={node.open} target="_blank" rel="noreferrer">↗ открыть</a>
          )}
        </div>
      )}
    </div>
  );
}

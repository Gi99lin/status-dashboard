import type { Topology } from '../../types';

export function MetricCards({ topology }: { topology: Topology }) {
  const networksCount = topology.networks.length;

  const urlCount = [
    ...topology.networks.flatMap((network) => network.services),
    ...topology.standalone,
  ].filter((node) => 'url' in node && node.url).length;

  return (
    <div className="rcol">
      <div className="panel scard">
        <div className="sl">Docker-сетей</div>
        <div className="sv b">{networksCount}</div>
      </div>
      <div className="panel scard">
        <div className="sl">Публичных URL</div>
        <div className="sv b">
          {urlCount} <small>· nginx</small>
        </div>
      </div>
    </div>
  );
}

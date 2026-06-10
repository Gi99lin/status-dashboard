import type { Host } from '../../types';

function vitalColor(value: number) {
  if (value < 50) return 'var(--green)';
  if (value < 80) return 'var(--yellow)';
  return 'var(--red)';
}

export function HostCard({ host }: { host: Host }) {
  const status = host.uptime ? `online · up ${host.uptime}` : 'online';
  const hardware = `${host.vcpu ?? '—'} vCPU · ${host.ram_total ?? '—'} GB`;
  const containers = `${host.containers.total} · ${host.containers.running} активны`;

  return (
    <div className="lcol">
      <div className="panel node">
        <div className="nm">
          <span className="dot up pulse" />
          {host.name}
        </div>
        <div className="row">
          <span>статус</span>
          <b>{status}</b>
        </div>
        <div className="row">
          <span>железо</span>
          <b>{hardware}</b>
        </div>
        <div className="row">
          <span>ОС</span>
          <b>{host.os || '—'}</b>
        </div>
        <div className="row">
          <span>контейнеров</span>
          <b>{containers}</b>
        </div>
      </div>
      <div className="panel vc">
        <div className="vr">
          <span className="vl">CPU</span>
          <div className="vb"><i style={{ width: `${host.cpu}%`, background: vitalColor(host.cpu) }} /></div>
          <span className="vv">{Math.round(host.cpu)}%</span>
        </div>
        <div className="vr">
          <span className="vl">RAM</span>
          <div className="vb"><i style={{ width: `${host.ram}%`, background: vitalColor(host.ram) }} /></div>
          <span className="vv">{Math.round(host.ram)}%</span>
        </div>
        <div className="vr">
          <span className="vl">Диск</span>
          <div className="vb"><i style={{ width: `${host.disk}%`, background: vitalColor(host.disk) }} /></div>
          <span className="vv">{Math.round(host.disk)}%</span>
        </div>
        <div className="vr">
          <span className="vl">Сеть</span>
          <div className="vb"><i style={{ width: `${Math.min(100, host.net)}%`, background: 'var(--blue)' }} /></div>
          <span className="vv">{host.net}M</span>
        </div>
      </div>
    </div>
  );
}

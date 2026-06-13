import type { Topology } from '../../types';
import type { Period } from '../../components/TopBar';
import { HostCard } from './HostCard';
import { TelemetryChart } from './TelemetryChart';
import { MetricCards } from './MetricCards';
import { TopologyMap } from './TopologyMap';
import './Topology.css';

export function MapSection({
  topology,
  period,
  live,
  error,
}: {
  topology: Topology;
  period: Period;
  live: boolean;
  error?: string | null;
}) {
  return (
    <>
      <div className="top">
        <HostCard host={topology.host} />
        <TelemetryChart telemetry={topology.telemetry} period={period} />
        <MetricCards topology={topology} />
      </div>

      <div className="topohead">
        <span className="lbl">Топология стека</span>
        {error ? (
          <span className="lbl" style={{ color: 'var(--red)' }}>ошибка загрузки: {error}</span>
        ) : (
          <span className="lbl" style={{ color: live ? 'var(--green)' : 'var(--fg-muted)' }}>
            {live ? 'живая' : 'нет связи'} · поток = трафик · кольцо = нагрузка
          </span>
        )}
        <div className="leg2">
          <span><span className="dot up" />работает</span>
          <span><span className="dot warn" />idle</span>
          <span><span className="dot down" />упал</span>
        </div>
      </div>

      <TopologyMap topology={topology} />

      <div className="foot">
        парсится из инфры: Docker API (контейнеры + сети + stats) · nginx (URL и маршруты) · Guacamole (VM по RDP/VNC) ·
        Netdata (метрики хоста) · лейблы (назначение/тех) — ┄ зелёный = трафик · ┄ синий = удалёнка · ┄ фиолетовый = мониторинг · ┄ бирюзовый = docker-сеть
      </div>
    </>
  );
}

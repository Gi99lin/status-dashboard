import type { Telemetry, TelemetryPoint } from '../../types';
import type { Period } from '../../components/TopBar';

const W = 1100;
const H = 184;

function buildLine(points: TelemetryPoint[], max: number) {
  if (points.length < 2) return '';
  const step = W / (points.length - 1);
  return points
    .map((point, i) => {
      const x = i * step;
      const y = H - (Math.min(point.value, max) / max) * H;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildArea(points: TelemetryPoint[], max: number) {
  const line = buildLine(points, max);
  if (!line) return '';
  return `${line} L${W},${H} L0,${H} Z`;
}

export function TelemetryChart({ telemetry, period }: { telemetry: Telemetry; period: Period }) {
  const hasData = telemetry.cpu.length > 1 || telemetry.ram.length > 1 || telemetry.net.length > 1;
  const netMax = Math.max(1, ...telemetry.net.map((p) => p.value));

  return (
    <div className="panel livewrap">
      <div className="lh">
        <span className="lbl">Телеметрия хоста · {period}</span>
        <span className="leg" style={{ marginLeft: 'auto' }}><i style={{ background: 'var(--green)' }} />CPU</span>
        <span className="leg"><i style={{ background: 'var(--yellow)' }} />RAM</span>
        <span className="leg"><i style={{ background: 'var(--blue)' }} />Сеть</span>
      </div>
      <div className="livechart">
        {hasData ? (
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
            <g stroke="color-mix(in oklch, oklch(100% 0 0) 5%, transparent)" strokeWidth="1">
              <line x1="0" y1={H * 0.25} x2={W} y2={H * 0.25} />
              <line x1="0" y1={H * 0.5} x2={W} y2={H * 0.5} />
              <line x1="0" y1={H * 0.75} x2={W} y2={H * 0.75} />
            </g>
            <path d={buildArea(telemetry.cpu, 100)} fill="color-mix(in oklch, var(--green) 12%, transparent)" />
            <path d={buildLine(telemetry.cpu, 100)} fill="none" stroke="var(--green)" strokeWidth="1.8" />
            <path d={buildLine(telemetry.ram, 100)} fill="none" stroke="var(--yellow)" strokeWidth="1.6" />
            <path d={buildLine(telemetry.net, netMax)} fill="none" stroke="var(--blue)" strokeWidth="1.4" opacity="0.9" />
          </svg>
        ) : (
          <span className="lbl" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            нет данных Netdata
          </span>
        )}
        <span className="lbl" style={{ position: 'absolute', left: 2, top: 2, fontSize: '.5rem' }}>100%</span>
        <span className="lbl" style={{ position: 'absolute', left: 2, bottom: 2, fontSize: '.5rem' }}>0</span>
      </div>
    </div>
  );
}

import { usePolling } from '../../hooks/usePolling';
import type { FlatContainer } from '../../types';
import { statusDot } from '../Map/statusDot';
import '../sections.css';
import './Containers.css';

export function ContainersSection() {
  const { data: containers, loading, error } = usePolling<FlatContainer[]>('/api/containers', []);

  const running = containers.filter((c) => statusDot(c.status) === 'up').length;

  return (
    <div className="panel ctable">
      <div className="ctable-head">
        <span className="lbl">Контейнеры · {containers.length} всего · {running} активны</span>
        {error && <span className="lbl" style={{ color: 'var(--red)' }}>ошибка: {error}</span>}
      </div>

      <div className="ctable-row ctable-row--head">
        <span className="lbl" />
        <span className="lbl">имя</span>
        <span className="lbl">образ</span>
        <span className="lbl">сети</span>
        <span className="lbl">cpu</span>
        <span className="lbl">ram</span>
        <span className="lbl">аптайм</span>
        <span className="lbl">рестарты</span>
        <span className="lbl">url</span>
      </div>

      {loading && containers.length === 0 && (
        <div className="ctable-empty">загрузка…</div>
      )}

      {!loading && containers.length === 0 && (
        <div className="ctable-empty">нет данных Docker</div>
      )}

      {containers.map((container) => (
        <div className="ctable-row" key={container.name}>
          <span className={`dot ${statusDot(container.status)}${statusDot(container.status) === 'up' ? ' pulse' : ''}`} />
          <span className="ctable-name">
            {container.name}
            {container.purpose && <small>{container.purpose}</small>}
          </span>
          <span className="ctable-dim">{container.tech || container.image || '—'}</span>
          <span className="ctable-nets">
            {container.networks.map((net) => (
              <span className="ctable-tag" key={net}>{net}</span>
            ))}
          </span>
          <span className="ctable-num">{container.cpu ?? 0}%</span>
          <span className="ctable-num">{Math.round(container.mem ?? 0)}MB</span>
          <span className="ctable-dim">{container.uptime || '—'}</span>
          <span className="ctable-num">{container.restarts ?? 0}</span>
          <span>
            {container.url
              ? <a className="open" href={container.url} target="_blank" rel="noreferrer">↗ открыть</a>
              : <span className="ctable-dim">—</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

import { usePolling } from '../../hooks/usePolling';
import type { FlatNetwork } from '../../types';
import '../sections.css';
import './Networks.css';

export function NetworksSection() {
  const { data: networks, loading, error } = usePolling<FlatNetwork[]>('/api/networks', []);

  return (
    <div>
      <div className="ctable-head">
        <span className="lbl">Docker-сети · {networks.length}</span>
        {error && <span className="lbl" style={{ color: 'var(--red)' }}>ошибка: {error}</span>}
      </div>

      {loading && networks.length === 0 && (
        <div className="panel ctable-empty">загрузка…</div>
      )}

      {!loading && networks.length === 0 && (
        <div className="panel ctable-empty">нет данных Docker</div>
      )}

      <div className="netgrid">
        {networks.map((network) => (
          <div className="panel netcard" key={network.name}>
            <div className="netcard-head">
              <span className="netcard-name">{network.name}</span>
              <span className={`netcard-badge${network.external ? ' netcard-badge--ext' : ''}`}>
                {network.external ? 'external' : 'compose'}
              </span>
            </div>
            <div className="row">
              <span>драйвер</span>
              <b>{network.driver}</b>
            </div>
            <div className="row">
              <span>контейнеров</span>
              <b>{network.containers}</b>
            </div>
            {network.members.length > 0 && (
              <div className="netcard-members">
                {network.members.map((member) => (
                  <span className="ctable-tag" key={member}>{member}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

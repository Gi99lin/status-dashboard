import './TopBar.css';

export type Section = 'map' | 'containers' | 'networks' | 'services';

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'map', label: 'Карта' },
  { id: 'containers', label: 'Контейнеры' },
  { id: 'networks', label: 'Сети' },
  { id: 'services', label: 'Сервисы' },
];

const PERIODS = ['10м', '1ч', '6ч', '24ч'] as const;
export type Period = (typeof PERIODS)[number];

interface TopBarProps {
  active: Section;
  onSelect: (section: Section) => void;
  hostName: string;
  hostUptime: string;
  period: Period;
  onPeriodChange: (period: Period) => void;
}

export function TopBar({ active, onSelect, hostName, hostUptime, period, onPeriodChange }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mk">◇</span> stack<b>.map</b>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={item.id === active ? 'active' : ''}
            onClick={(event) => {
              event.preventDefault();
              onSelect(item.id);
            }}
          >
            {item.id === 'map' && <span className="dot up" />}
            {item.label}
          </a>
        ))}
        <a className="soon" href="#cicd" aria-disabled="true" onClick={(event) => event.preventDefault()}>
          CI / CD <span className="pill">скоро</span>
        </a>
      </nav>
      <div className="tb-right">
        <span className="host-pill">
          <span className="dot up pulse" />
          <b>{hostName}</b> · online {hostUptime}
        </span>
        <div className="periods">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className={p === period ? 'pbtn active' : 'pbtn'}
              onClick={() => onPeriodChange(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

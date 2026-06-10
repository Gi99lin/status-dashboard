import { useState } from 'react';
import { TopBar, type Period, type Section } from './components/TopBar';
import { Placeholder } from './components/Placeholder';
import { LoginGate } from './components/LoginGate';
import { MapSection } from './sections/Map/MapSection';
import { ContainersSection } from './sections/Containers/ContainersSection';
import { NetworksSection } from './sections/Networks/NetworksSection';
import { useTopology } from './hooks/useTopology';
import { useLiveSocket } from './hooks/useLiveSocket';
import { useAuth } from './hooks/useAuth';
import './App.css';

function App() {
  const [section, setSection] = useState<Section>('map');
  const [period, setPeriod] = useState<Period>('1ч');
  const { state: authState, login } = useAuth();
  const { topology, error } = useTopology(period);
  const { connected } = useLiveSocket();

  if (authState === 'checking') return null;
  if (authState === 'guest') return <LoginGate onLogin={login} />;

  return (
    <>
      <TopBar
        active={section}
        onSelect={setSection}
        period={period}
        onPeriodChange={setPeriod}
        hostName={topology.host.name}
        hostUptime={topology.host.uptime || '—'}
      />
      <main className="wrap">
        {section === 'map' && <MapSection topology={topology} period={period} live={connected} error={error} />}
        {section === 'containers' && <ContainersSection />}
        {section === 'networks' && <NetworksSection />}
        {section === 'services' && <Placeholder title="Сервисы" note="Скоро" />}
      </main>
    </>
  );
}

export default App;

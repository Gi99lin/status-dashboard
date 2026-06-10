import { MapSection } from './sections/Map/MapSection';
import { useTopology } from './hooks/useTopology';
import { useLiveSocket } from './hooks/useLiveSocket';
import type { Period } from './components/TopBar';

export function StatusMap({ api, period }: { api: string; period: Period }) {
  const { topology } = useTopology(period, api);
  const { connected } = useLiveSocket(api);

  return (
    <div className="wrap">
      <MapSection topology={topology} period={period} live={connected} />
    </div>
  );
}

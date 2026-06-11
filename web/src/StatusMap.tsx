import { MapSection } from './sections/Map/MapSection';
import { useTopology } from './hooks/useTopology';
import type { Period } from './components/TopBar';

export function StatusMap({ api, period }: { api: string; period: Period }) {
  // Embed is poll-only — no socket. `api` may be a same-origin path (e.g. "/stack"),
  // where a socket.io client would mis-connect to the host page's socket, so the
  // "live" indicator simply reflects whether the latest poll succeeded.
  const { topology, error } = useTopology(period, api);

  return (
    <div className="wrap">
      <MapSection topology={topology} period={period} live={!error} />
    </div>
  );
}

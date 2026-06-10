import { useEffect, useState } from 'react';
import { emptyTopology, type Topology } from '../types';
import type { Period } from '../components/TopBar';
import { apiFetch } from '../lib/demo';

const PERIOD_MINUTES: Record<Period, number> = {
  '10м': 10,
  '1ч': 60,
  '6ч': 360,
  '24ч': 1440,
};

const POLL_MS = 5000;

export function useTopology(period: Period, apiBase = '') {
  const [topology, setTopology] = useState<Topology>(emptyTopology());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const minutes = PERIOD_MINUTES[period];

    async function load() {
      try {
        const res = await apiFetch(`${apiBase}/api/topology?minutes=${minutes}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Topology;
        if (!cancelled) {
          setTopology(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [period, apiBase]);

  return { topology, loading, error };
}

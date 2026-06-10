import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { DEMO } from '../lib/demo';

export function useLiveSocket(apiBase = '') {
  const [connected, setConnected] = useState(DEMO);

  useEffect(() => {
    // Demo has no backend — show the "live" indicator without opening a socket.
    if (DEMO) {
      setConnected(true);
      return;
    }
    const socket = apiBase ? io(apiBase, { path: '/socket.io' }) : io({ path: '/socket.io' });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    return () => {
      socket.disconnect();
    };
  }, [apiBase]);

  return { connected };
}

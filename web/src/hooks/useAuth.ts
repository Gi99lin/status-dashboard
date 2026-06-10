import { useCallback, useEffect, useState } from 'react';
import { DEMO } from '../lib/demo';

type AuthState = 'checking' | 'authed' | 'guest';

export function useAuth() {
  const [state, setState] = useState<AuthState>(DEMO ? 'authed' : 'checking');

  const check = useCallback(async () => {
    if (DEMO) {
      setState('authed');
      return;
    }
    try {
      const res = await fetch('/api/auth-check');
      setState(res.ok ? 'authed' : 'guest');
    } catch {
      setState('guest');
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const login = useCallback(async (password: string) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setState('authed');
      return true;
    }
    return false;
  }, []);

  return { state, login };
}

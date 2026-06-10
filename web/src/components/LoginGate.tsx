import { useState, type FormEvent } from 'react';
import './LoginGate.css';

export function LoginGate({ onLogin }: { onLogin: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    const ok = await onLogin(password);
    if (!ok) setError('Неверный пароль');
    setBusy(false);
  }

  return (
    <div className="login-screen">
      <form className="panel login-box" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span className="mk">◇</span> stack<b>.map</b>
        </div>
        <span className="lbl">вход</span>
        <input
          className="login-input"
          type="password"
          placeholder="пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <span className="login-error">{error}</span>}
        <button className="login-btn" type="submit" disabled={busy}>
          {busy ? '...' : 'войти'}
        </button>
      </form>
    </div>
  );
}

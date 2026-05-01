import { FormEvent, useState } from 'react';
import { LogIn } from 'lucide-react';
import { useDeckStore } from '../store/deckStore';

export function LoginView() {
  const login = useDeckStore((state) => state.login);
  const loginError = useDeckStore((state) => state.loginError);
  const busy = useDeckStore((state) => state.busyAction === 'login');
  const [service, setService] = useState('https://bsky.social');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await login({ service, identifier, password });
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <h1>Bluedeck</h1>
        <p className="muted">A local multi-column Bluesky dashboard.</p>
        <form onSubmit={onSubmit} className="login-form">
          <label>
            Service
            <input value={service} onChange={(event) => setService(event.target.value)} required />
          </label>
          <label>
            Handle or email
            <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="you.bsky.social" required />
          </label>
          <label>
            App password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </label>
          {loginError ? <p className="error-text">{loginError}</p> : null}
          <button className="primary-button" disabled={busy}>
            <LogIn size={17} />
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

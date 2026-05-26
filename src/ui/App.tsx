import { useEffect } from 'react';
import { LogOut, Moon, Plus, RefreshCcw, Send, Sun } from 'lucide-react';
import { useDeckStore } from '../store/deckStore';
import { LoginView } from './LoginView';
import { ColumnBoard } from './ColumnBoard';
import { AddColumnDialog } from './AddColumnDialog';
import { Composer } from './Composer';

export function App() {
  const session = useDeckStore((state) => state.session);
  const hydrating = useDeckStore((state) => state.hydrating);
  const refreshAll = useDeckStore((state) => state.refreshAll);
  const logout = useDeckStore((state) => state.logout);
  const openCompose = useDeckStore((state) => state.openCompose);
  const compose = useDeckStore((state) => state.compose);
  const theme = useDeckStore((state) => state.theme);
  const toggleTheme = useDeckStore((state) => state.toggleTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (session) void refreshAll();
  }, [session, refreshAll]);

  if (hydrating) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <h1>Bluedeck</h1>
          <p className="muted">Resuming session...</p>
        </section>
      </main>
    );
  }

  if (!session) return <LoginView />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Bluedeck</h1>
          <p>@{session.handle}</p>
        </div>
        <div className="topbar-actions">
          <button className="icon-button text-button" onClick={() => openCompose({ mode: 'post' })}>
            <Send size={16} />
            Post
          </button>
          <button className="icon-button" title="Refresh all columns" onClick={() => void refreshAll()}>
            <RefreshCcw size={17} />
          </button>
          <button className="icon-button" title={theme === 'dark' ? 'Use light mode' : 'Use dark mode'} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <AddColumnDialog trigger={<Plus size={18} />} />
          <button className="icon-button" title="Log out" onClick={logout}>
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <ColumnBoard />
      {compose ? <Composer /> : null}
    </main>
  );
}

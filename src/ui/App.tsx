import { useEffect } from 'react';
import { Plus, RefreshCcw, Send, LogOut } from 'lucide-react';
import { useDeckStore } from '../store/deckStore';
import { LoginView } from './LoginView';
import { ColumnBoard } from './ColumnBoard';
import { AddColumnDialog } from './AddColumnDialog';
import { Composer } from './Composer';

export function App() {
  const session = useDeckStore((state) => state.session);
  const refreshAll = useDeckStore((state) => state.refreshAll);
  const logout = useDeckStore((state) => state.logout);
  const openCompose = useDeckStore((state) => state.openCompose);
  const compose = useDeckStore((state) => state.compose);

  useEffect(() => {
    if (session) void refreshAll();
  }, [session, refreshAll]);

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

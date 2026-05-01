import { ReactNode, useState } from 'react';
import { Bookmark, Bell, Home, List, Rss, Search, User, X } from 'lucide-react';
import { useDeckStore } from '../store/deckStore';
import type { ColumnKind, DiscoveryResult } from '../lib/types';

type Props = {
  trigger: ReactNode;
};

const quickColumns: Array<{ kind: ColumnKind; label: string; icon: ReactNode }> = [
  { kind: 'home', label: 'Home', icon: <Home size={16} /> },
  { kind: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { kind: 'bookmarks', label: 'Bookmarks', icon: <Bookmark size={16} /> },
  { kind: 'search', label: 'Search', icon: <Search size={16} /> },
  { kind: 'feed', label: 'Feed URI', icon: <Rss size={16} /> },
  { kind: 'list', label: 'List URI', icon: <List size={16} /> },
  { kind: 'profile', label: 'Profile', icon: <User size={16} /> },
];

const exampleFeedUri = 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot';
const exampleListUri = 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.graph.list/3lvpca43j5z26';
const exampleFeedName = 'Discover';
const exampleListName = 'Community Showcase';

export function AddColumnDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [manualKind, setManualKind] = useState<ColumnKind>('search');
  const [manualName, setManualName] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [loading, setLoading] = useState(false);
  const addColumn = useDeckStore((state) => state.addColumn);
  const addDiscoveredColumn = useDeckStore((state) => state.addDiscoveredColumn);
  const discover = useDeckStore((state) => state.discover);

  async function runDiscovery() {
    setLoading(true);
    try {
      setResults(await discover(query));
    } finally {
      setLoading(false);
    }
  }

  function addManualColumn() {
    const title = manualName.trim();
    if (manualKind === 'search') addColumn('search', { query: manualValue, title: title || `Search: ${manualValue}` }, title || `Search: ${manualValue}`);
    if (manualKind === 'feed') addColumn('feed', { uri: manualValue, title: title || 'Feed' }, title || 'Feed');
    if (manualKind === 'list') addColumn('list', { uri: manualValue, title: title || 'List' }, title || 'List');
    if (manualKind === 'profile') addColumn('profile', { actor: manualValue, title: title || manualValue }, title || manualValue);
    if (manualKind === 'home' || manualKind === 'notifications' || manualKind === 'bookmarks') addColumn(manualKind);
    setOpen(false);
  }

  return (
    <>
      <button className="icon-button" title="Add column" onClick={() => setOpen(true)}>
        {trigger}
      </button>
      {open ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" role="dialog" aria-modal="true" aria-label="Add column">
            <header className="modal-header">
              <h2>Add column</h2>
              <button className="icon-button" title="Close" onClick={() => setOpen(false)}>
                <X size={17} />
              </button>
            </header>
            <div className="quick-grid">
              {quickColumns.map((item) => (
                <button
                  key={item.kind}
                  onClick={() => {
                    setManualKind(item.kind);
                    if (item.kind === 'home' || item.kind === 'notifications' || item.kind === 'bookmarks') {
                      addColumn(item.kind);
                      setOpen(false);
                    }
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
            <div className="dialog-section">
              <h3>Search or paste</h3>
              <div className="example-row">
                <button onClick={() => setQuery(exampleFeedUri)}>{exampleFeedName} feed</button>
                <button onClick={() => setQuery(exampleListUri)}>{exampleListName} list</button>
              </div>
              <div className="inline-form">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="handle, feed name, or at:// URI" />
                <button onClick={() => void runDiscovery()} disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
              <div className="result-list">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      addDiscoveredColumn(result);
                      setOpen(false);
                    }}
                  >
                    <strong>{result.title}</strong>
                    {result.subtitle ? <span>{result.subtitle}</span> : null}
                  </button>
                ))}
              </div>
            </div>
            <div className="dialog-section">
              <h3>Manual column</h3>
              <div className="example-row">
                <button
                  onClick={() => {
                    setManualKind('feed');
                    setManualName(exampleFeedName);
                    setManualValue(exampleFeedUri);
                  }}
                >
                  Use feed example
                </button>
                <button
                  onClick={() => {
                    setManualKind('list');
                    setManualName(exampleListName);
                    setManualValue(exampleListUri);
                  }}
                >
                  Use list example
                </button>
              </div>
              <input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Column name" />
              <div className="inline-form">
                <select value={manualKind} onChange={(event) => setManualKind(event.target.value as ColumnKind)}>
                  <option value="search">Search</option>
                  <option value="feed">Feed URI</option>
                  <option value="list">List URI</option>
                  <option value="profile">Profile</option>
                </select>
                <input value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="query, handle, or at:// URI" />
                <button onClick={addManualColumn}>Add</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

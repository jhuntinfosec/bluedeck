import { ArrowLeft, ArrowRight, RefreshCcw, Trash2 } from 'lucide-react';
import { useDeckStore } from '../store/deckStore';
import type { DeckColumn } from '../lib/types';
import { PostCard } from './PostCard';

type Props = {
  column: DeckColumn;
};

export function DeckColumnView({ column }: Props) {
  const runtime = useDeckStore((state) => state.runtime[column.id]);
  const refreshColumn = useDeckStore((state) => state.refreshColumn);
  const removeColumn = useDeckStore((state) => state.removeColumn);
  const moveColumn = useDeckStore((state) => state.moveColumn);
  const resizeColumn = useDeckStore((state) => state.resizeColumn);
  const items = runtime?.items ?? [];

  return (
    <article className="deck-column" style={{ width: column.width }}>
      <header className="column-header">
        <div>
          <h2>{column.title}</h2>
          <p>{subtitle(column, runtime?.lastUpdated)}</p>
        </div>
        <div className="column-actions">
          {runtime?.newCount ? <span className="pill">{runtime.newCount}</span> : null}
          <button title="Move left" onClick={() => moveColumn(column.id, -1)}>
            <ArrowLeft size={15} />
          </button>
          <button title="Move right" onClick={() => moveColumn(column.id, 1)}>
            <ArrowRight size={15} />
          </button>
          <button title="Refresh column" onClick={() => void refreshColumn(column.id)}>
            <RefreshCcw size={15} />
          </button>
          <button title="Remove column" onClick={() => removeColumn(column.id)}>
            <Trash2 size={15} />
          </button>
        </div>
      </header>
      <input
        className="width-slider"
        aria-label={`Resize ${column.title}`}
        type="range"
        min="280"
        max="520"
        value={column.width}
        onChange={(event) => resizeColumn(column.id, Number(event.target.value))}
      />
      {runtime?.error ? <div className="column-message error-text">{runtime.error}</div> : null}
      {runtime?.loading ? <div className="column-message">Loading...</div> : null}
      {!runtime?.loading && items.length === 0 && !runtime?.error ? <div className="column-message">No posts yet.</div> : null}
      <div className="post-list">
        {items.map((item) => (
          <PostCard key={item.id} item={item} />
        ))}
      </div>
      {runtime?.cursor ? (
        <button className="load-more" disabled={runtime.loadingMore} onClick={() => void refreshColumn(column.id, true)}>
          {runtime.loadingMore ? 'Loading...' : 'Load more'}
        </button>
      ) : null}
    </article>
  );
}

function subtitle(column: DeckColumn, lastUpdated?: string): string {
  if (lastUpdated) return `Updated ${new Date(lastUpdated).toLocaleTimeString()}`;
  if (column.kind === 'search') return column.settings.query ?? 'Search';
  if (column.kind === 'profile') return column.settings.actor ?? 'Profile';
  return column.kind;
}

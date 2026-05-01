import { useEffect } from 'react';
import { DeckColumnView } from './DeckColumnView';
import { useDeckStore } from '../store/deckStore';

export function ColumnBoard() {
  const columns = useDeckStore((state) => state.columns);
  const refreshColumn = useDeckStore((state) => state.refreshColumn);

  useEffect(() => {
    const timers = columns.map((column) => {
      const seconds = column.settings.pollSeconds;
      if (!seconds || seconds < 15) return undefined;
      return window.setInterval(() => {
        void refreshColumn(column.id);
      }, seconds * 1000);
    });
    return () => timers.forEach((timer) => timer && window.clearInterval(timer));
  }, [columns, refreshColumn]);

  return (
    <section className="column-board" aria-label="Columns">
      {columns.map((column) => (
        <DeckColumnView key={column.id} column={column} />
      ))}
    </section>
  );
}

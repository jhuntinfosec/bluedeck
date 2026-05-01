import type { ColumnKind, DeckColumn } from './types';

const defaultPollSeconds = 90;

export const columnLabels: Record<ColumnKind, string> = {
  home: 'Home',
  notifications: 'Notifications',
  search: 'Search',
  feed: 'Feed',
  list: 'List',
  profile: 'Profile',
  bookmarks: 'Bookmarks',
  thread: 'Thread',
};

export function createColumn(kind: ColumnKind, overrides: Partial<DeckColumn> = {}): DeckColumn {
  const id = overrides.id ?? crypto.randomUUID();
  const title = overrides.title ?? titleFor(kind, overrides.settings?.title);

  return {
    id,
    kind,
    title,
    width: overrides.width ?? 332,
    settings: {
      pollSeconds: defaultPollSeconds,
      ...overrides.settings,
    },
  };
}

export function defaultColumns(): DeckColumn[] {
  return [
    createColumn('home', { id: 'home', width: 340 }),
    createColumn('notifications', { id: 'notifications', width: 320 }),
  ];
}

export function validateColumn(column: DeckColumn): string | undefined {
  if (column.kind === 'search' && !column.settings.query?.trim()) return 'Search columns need a query.';
  if ((column.kind === 'feed' || column.kind === 'list') && !column.settings.uri?.trim()) {
    return `${columnLabels[column.kind]} columns need an AT-URI.`;
  }
  if (column.kind === 'profile' && !column.settings.actor?.trim()) {
    return 'Profile columns need a handle or DID.';
  }
  if (column.kind === 'thread' && !column.settings.uri?.trim()) {
    return 'Thread columns need a post URI.';
  }
  return undefined;
}

function titleFor(kind: ColumnKind, custom?: string): string {
  if (custom?.trim()) return custom.trim();
  return columnLabels[kind];
}

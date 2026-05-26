import { create } from 'zustand';
import { bsky } from '../lib/bsky';
import { createColumn, defaultColumns, validateColumn } from '../lib/columns';
import { loadColumns, loadSession, loadTheme, saveColumns, saveSession, saveTheme } from '../lib/storage';
import type { ColumnKind, ColumnRuntime, ComposeIntent, DeckColumn, DiscoveryResult, FeedItem, SessionData, ThemeMode } from '../lib/types';

type DeckState = {
  session?: SessionData;
  columns: DeckColumn[];
  runtime: Record<string, ColumnRuntime>;
  theme: ThemeMode;
  hydrating: boolean;
  loginError?: string;
  busyAction?: string;
  compose?: ComposeIntent;
  hydrate: () => Promise<void>;
  login: (input: { service: string; identifier: string; password: string }) => Promise<void>;
  logout: () => void;
  addColumn: (kind: ColumnKind, settings?: Partial<DeckColumn['settings']>, title?: string) => void;
  addDiscoveredColumn: (result: DiscoveryResult) => void;
  openProfile: (item: FeedItem) => void;
  openThread: (item: FeedItem) => void;
  removeColumn: (id: string) => void;
  moveColumn: (id: string, direction: -1 | 1) => void;
  resizeColumn: (id: string, width: number) => void;
  refreshColumn: (id: string, append?: boolean) => Promise<void>;
  refreshAll: () => Promise<void>;
  discover: (query: string) => Promise<DiscoveryResult[]>;
  openCompose: (intent: ComposeIntent) => void;
  closeCompose: () => void;
  submitPost: (text: string, images: File[]) => Promise<void>;
  actOnPost: (action: 'like' | 'repost' | 'bookmark' | 'delete', item: FeedItem) => Promise<void>;
  actOnAuthor: (action: 'follow' | 'unfollow', item: FeedItem) => Promise<void>;
  toggleTheme: () => void;
};

const initialColumns = loadColumns() ?? defaultColumns();
const initialSession = loadSession();
const initialTheme = loadTheme() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
let authRun = 0;

export const useDeckStore = create<DeckState>((set, get) => ({
  session: undefined,
  columns: initialColumns,
  runtime: {},
  theme: initialTheme,
  hydrating: Boolean(initialSession),
  hydrate: async () => {
    const run = ++authRun;
    const session = loadSession();
    set({ columns: loadColumns() ?? defaultColumns(), hydrating: Boolean(session) });
    if (!session) {
      if (run === authRun) set({ session: undefined, runtime: {}, hydrating: false });
      return;
    }
    try {
      const resumedSession = await bsky.resume(session);
      if (run !== authRun) return;
      set({ session: resumedSession, loginError: undefined, hydrating: false });
    } catch (error) {
      if (run !== authRun) return;
      bsky.clear();
      saveSession(undefined);
      set({ session: undefined, runtime: {}, loginError: errorMessage(error), hydrating: false });
    }
  },
  login: async (input) => {
    const run = ++authRun;
    set({ loginError: undefined, busyAction: 'login', hydrating: false });
    try {
      const session = await bsky.login(input);
      if (run !== authRun) return;
      saveSession(session);
      set({ session, busyAction: undefined });
      await get().refreshAll();
    } catch (error) {
      if (run !== authRun) return;
      set({ loginError: errorMessage(error), busyAction: undefined });
    }
  },
  logout: () => {
    authRun += 1;
    bsky.clear();
    saveSession(undefined);
    set({ session: undefined, runtime: {}, loginError: undefined, hydrating: false, busyAction: undefined });
  },
  addColumn: (kind, settings, title) => {
    const column = createColumn(kind, { title, settings: { pollSeconds: 90, ...settings } });
    const error = validateColumn(column);
    if (error) {
      setRuntimeError(set, column.id, error);
      return;
    }
    const columns = [...get().columns, column];
    saveColumns(columns);
    set({ columns });
    void get().refreshColumn(column.id);
  },
  addDiscoveredColumn: (result) => {
    get().addColumn(
      result.kind,
      {
        uri: result.uri,
        actor: result.actor,
        query: result.query,
        title: result.title,
      },
      result.title,
    );
  },
  openProfile: (item) => {
    const actor = item.authorHandle;
    const title = item.authorName ? `${item.authorName} (@${actor})` : `@${actor}`;
    const existing = get().columns.find((column) => column.kind === 'profile' && column.settings.actor === actor);
    if (existing) {
      void get().refreshColumn(existing.id);
      return;
    }
    get().addColumn('profile', { actor, title, pollSeconds: 90 }, title);
  },
  openThread: (item) => {
    const title = `Thread: @${item.authorHandle}`;
    const existing = get().columns.find((column) => column.kind === 'thread' && column.settings.uri === item.uri);
    if (existing) {
      void get().refreshColumn(existing.id);
      return;
    }
    get().addColumn('thread', { uri: item.uri, title, pollSeconds: 0 }, title);
  },
  removeColumn: (id) => {
    const columns = get().columns.filter((column) => column.id !== id);
    saveColumns(columns);
    set((state) => {
      const runtime = { ...state.runtime };
      delete runtime[id];
      return { columns, runtime };
    });
  },
  moveColumn: (id, direction) => {
    const columns = [...get().columns];
    const index = columns.findIndex((column) => column.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= columns.length) return;
    [columns[index], columns[nextIndex]] = [columns[nextIndex], columns[index]];
    saveColumns(columns);
    set({ columns });
  },
  resizeColumn: (id, width) => {
    const columns = get().columns.map((column) => (column.id === id ? { ...column, width: clamp(width, 280, 520) } : column));
    saveColumns(columns);
    set({ columns });
  },
  refreshColumn: async (id, append = false) => {
    const column = get().columns.find((item) => item.id === id);
    if (!column) return;
    const current = get().runtime[id];
    setRuntime(set, id, {
      ...(current ?? emptyRuntime()),
      loading: !append,
      loadingMore: append,
      error: undefined,
    });
    try {
      const result = await bsky.fetchColumn(column, append ? current?.cursor : undefined);
      const previous = append ? current?.items ?? [] : [];
      const items = dedupe([...previous, ...result.items]);
      const oldIds = new Set(current?.items.map((item) => item.id));
      const newCount = append ? 0 : result.items.filter((item) => !oldIds.has(item.id)).length;
      setRuntime(set, id, {
        items,
        cursor: result.cursor,
        loading: false,
        loadingMore: false,
        lastUpdated: new Date().toISOString(),
        newCount,
      });
    } catch (error) {
      setRuntime(set, id, {
        ...(current ?? emptyRuntime()),
        loading: false,
        loadingMore: false,
        error: errorMessage(error),
      });
    }
  },
  refreshAll: async () => {
    await Promise.all(get().columns.map((column) => get().refreshColumn(column.id)));
  },
  discover: (query) => bsky.discover(query),
  openCompose: (intent) => set({ compose: intent }),
  closeCompose: () => set({ compose: undefined }),
  submitPost: async (text, images) => {
    const compose = get().compose;
    set({ busyAction: 'compose' });
    try {
      await bsky.createPost(
        text,
        compose?.mode === 'reply'
          ? { replyTo: compose.item }
          : compose?.mode === 'quote'
            ? { quote: compose.item }
            : undefined,
        images,
      );
      set({ compose: undefined, busyAction: undefined });
      await get().refreshAll();
    } catch (error) {
      set({ busyAction: undefined, loginError: errorMessage(error) });
    }
  },
  actOnPost: async (action, item) => {
    set({ busyAction: `${action}:${item.id}` });
    try {
      if (action === 'like') await bsky.like(item);
      if (action === 'repost') await bsky.repost(item);
      if (action === 'bookmark') await bsky.bookmark(item);
      if (action === 'delete') await bsky.deletePost(item);
      set({ busyAction: undefined });
      await get().refreshAll();
    } catch (error) {
      set({ busyAction: undefined, loginError: errorMessage(error) });
    }
  },
  actOnAuthor: async (action, item) => {
    set({ busyAction: `${action}:${item.authorHandle}` });
    try {
      if (action === 'follow') await bsky.follow(item);
      if (action === 'unfollow') await bsky.unfollow(item);
      set({ busyAction: undefined });
      await get().refreshAll();
    } catch (error) {
      set({ busyAction: undefined, loginError: errorMessage(error) });
    }
  },
  toggleTheme: () => {
    const theme = get().theme === 'dark' ? 'light' : 'dark';
    saveTheme(theme);
    set({ theme });
  },
}));

if (initialSession) void useDeckStore.getState().hydrate();

function setRuntime(set: (partial: Partial<DeckState> | ((state: DeckState) => Partial<DeckState>)) => void, id: string, runtime: ColumnRuntime): void {
  set((state) => ({ runtime: { ...state.runtime, [id]: runtime } }));
}

function setRuntimeError(set: (partial: Partial<DeckState> | ((state: DeckState) => Partial<DeckState>)) => void, id: string, error: string): void {
  setRuntime(set, id, { ...emptyRuntime(), error });
}

function emptyRuntime(): ColumnRuntime {
  return { items: [], loading: false, loadingMore: false, newCount: 0 };
}

function dedupe(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

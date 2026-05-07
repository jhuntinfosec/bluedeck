import type { DeckColumn, SessionData, ThemeMode } from './types';

const SESSION_KEY = 'bluedeck.session.v1';
const COLUMNS_KEY = 'bluedeck.columns.v1';
const THEME_KEY = 'bluedeck.theme.v1';

export function loadSession(): SessionData | undefined {
  return readJson<SessionData>(SESSION_KEY);
}

export function saveSession(session: SessionData | undefined): void {
  writeJson(SESSION_KEY, session);
}

export function loadColumns(): DeckColumn[] | undefined {
  return readJson<DeckColumn[]>(COLUMNS_KEY);
}

export function saveColumns(columns: DeckColumn[]): void {
  writeJson(COLUMNS_KEY, columns);
}

export function loadTheme(): ThemeMode | undefined {
  const theme = readJson<ThemeMode>(THEME_KEY);
  return theme === 'light' || theme === 'dark' ? theme : undefined;
}

export function saveTheme(theme: ThemeMode): void {
  writeJson(THEME_KEY, theme);
}

function readJson<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson<T>(key: string, value: T | undefined): void {
  if (value === undefined) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

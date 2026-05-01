export type ColumnKind =
  | 'home'
  | 'notifications'
  | 'search'
  | 'feed'
  | 'list'
  | 'profile'
  | 'bookmarks'
  | 'thread';

export type ColumnSettings = {
  query?: string;
  uri?: string;
  actor?: string;
  title?: string;
  pollSeconds: number;
};

export type DeckColumn = {
  id: string;
  kind: ColumnKind;
  title: string;
  settings: ColumnSettings;
  width: number;
};

export type SessionData = {
  service: string;
  handle: string;
  did: string;
  accessJwt: string;
  refreshJwt: string;
  active: boolean;
};

export type FeedItem = {
  id: string;
  uri: string;
  cid?: string;
  authorHandle: string;
  authorName?: string;
  authorAvatar?: string;
  indexedAt?: string;
  text: string;
  reason?: string;
  replyContext?: string;
  threadContext?: string;
  likeCount?: number;
  repostCount?: number;
  replyCount?: number;
  quoteCount?: number;
  likedUri?: string;
  repostedUri?: string;
  bookmarked?: boolean;
  images: string[];
  links: FeedLink[];
  media: FeedMedia[];
  external?: FeedExternal;
  raw: unknown;
};

export type FeedLink = {
  text: string;
  uri: string;
  start: number;
  end: number;
};

export type FeedMedia =
  | {
      type: 'image';
      thumb: string;
      fullsize: string;
      alt?: string;
    }
  | {
      type: 'video';
      playlist: string;
      thumbnail?: string;
      alt?: string;
    };

export type FeedExternal = {
  uri: string;
  title: string;
  description?: string;
  thumb?: string;
};

export type ColumnRuntime = {
  items: FeedItem[];
  cursor?: string;
  loading: boolean;
  loadingMore: boolean;
  error?: string;
  lastUpdated?: string;
  newCount: number;
};

export type ComposeIntent =
  | { mode: 'post' }
  | { mode: 'reply'; item: FeedItem }
  | { mode: 'quote'; item: FeedItem };

export type ComposeDraft = {
  text: string;
  images: File[];
};

export type DiscoveryResult = {
  id: string;
  kind: Extract<ColumnKind, 'feed' | 'list' | 'profile' | 'search'>;
  title: string;
  subtitle?: string;
  uri?: string;
  actor?: string;
  query?: string;
};

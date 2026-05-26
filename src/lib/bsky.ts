import { BskyAgent, RichText } from '@atproto/api';
import type { AtpSessionEvent } from '@atproto/api';
import type { ColumnKind, DeckColumn, DiscoveryResult, FeedItem, SessionData } from './types';
import { mapFeedView, mapNotification, mapThread } from './feedMapper';
import { saveSession } from './storage';

export type FetchResult = {
  items: FeedItem[];
  cursor?: string;
};

export type LoginInput = {
  service: string;
  identifier: string;
  password: string;
};

export class BskyService {
  private agent?: BskyAgent;
  private session?: SessionData;

  constructor(private readonly onSessionChange?: (session: SessionData | undefined, event: AtpSessionEvent) => void) {}

  async login(input: LoginInput): Promise<SessionData> {
    const agent = this.createAgent(input.service);
    const result = await agent.login({
      identifier: input.identifier,
      password: input.password,
    });
    this.agent = agent;
    this.session = sessionWithService(input.service, result.data as SessionData);
    return this.session;
  }

  async resume(session: SessionData): Promise<SessionData> {
    const agent = this.createAgent(session.service);
    this.agent = agent;
    this.session = session;
    await agent.resumeSession(session as any);
    this.agent = agent;
    this.session = sessionWithService(session.service, (agent.session ?? session) as SessionData);
    return this.session;
  }

  clear(): void {
    this.agent = undefined;
    this.session = undefined;
  }

  private createAgent(service: string): BskyAgent {
    return new BskyAgent({
      service,
      persistSession: (event, session) => {
        this.session = session ? sessionWithService(service, session as SessionData) : undefined;
        this.onSessionChange?.(this.session, event);
      },
    });
  }

  async fetchColumn(column: DeckColumn, cursor?: string): Promise<FetchResult> {
    const agent = this.requireAgent();
    const limit = 50;

    switch (column.kind) {
      case 'home': {
        const { data } = await agent.getTimeline({ cursor, limit });
        return mapFeedResponse(data);
      }
      case 'notifications': {
        const { data } = await agent.listNotifications({ cursor, limit });
        return {
          items: data.notifications.map(mapNotification).filter(Boolean) as FeedItem[],
          cursor: data.cursor,
        };
      }
      case 'search': {
        const { data } = await agent.app.bsky.feed.searchPosts({
          q: column.settings.query ?? '',
          cursor,
          limit,
        });
        return {
          items: data.posts.map(mapFeedView).filter(Boolean) as FeedItem[],
          cursor: data.cursor,
        };
      }
      case 'feed': {
        const { data } = await agent.app.bsky.feed.getFeed({
          feed: column.settings.uri ?? '',
          cursor,
          limit,
        });
        return mapFeedResponse(data);
      }
      case 'list': {
        const { data } = await agent.app.bsky.feed.getListFeed({
          list: column.settings.uri ?? '',
          cursor,
          limit,
        });
        return mapFeedResponse(data);
      }
      case 'profile': {
        const { data } = await agent.app.bsky.feed.getAuthorFeed({
          actor: column.settings.actor ?? '',
          cursor,
          limit,
        });
        return mapFeedResponse(data);
      }
      case 'bookmarks': {
        const response = await this.rawXrpc('app.bsky.bookmark.getBookmarks', { cursor, limit });
        return {
          items: response.bookmarks.map((bookmark: any) => mapFeedView(bookmark.item)).filter(Boolean),
          cursor: response.cursor,
        };
      }
      case 'thread': {
        const { data } = await agent.app.bsky.feed.getPostThread({
          uri: column.settings.uri ?? '',
          depth: 6,
          parentHeight: 80,
        });
        return {
          items: mapThread(data, column.settings.uri ?? ''),
        };
      }
      default:
        throw new Error(`Unsupported column kind: ${column.kind satisfies never}`);
    }
  }

  async discover(query: string): Promise<DiscoveryResult[]> {
    const agent = this.requireAgent();
    const trimmed = query.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('at://')) {
      return [uriDiscoveryResult(trimmed)];
    }

    const [actors, feeds, lists] = await Promise.all([
      agent.app.bsky.actor.searchActors({ q: trimmed, limit: 5 }),
      agent.app.bsky.feed.getSuggestedFeeds({ limit: 50 }),
      agent.app.bsky.graph.getLists({ actor: trimmed, limit: 10 }).catch(() => ({ data: { lists: [] } })),
    ]);

    const actorResults: DiscoveryResult[] = actors.data.actors.map((actor: any) => ({
      id: `profile:${actor.did}`,
      kind: 'profile',
      title: actor.displayName || actor.handle,
      subtitle: `@${actor.handle}`,
      actor: actor.handle,
    }));

    const feedResults: DiscoveryResult[] = feeds.data.feeds
      .filter((feed: any) => feed.displayName?.toLowerCase().includes(trimmed.toLowerCase()) || feed.description?.toLowerCase().includes(trimmed.toLowerCase()))
      .slice(0, 5)
      .map((feed: any) => ({
        id: `feed:${feed.uri}`,
        kind: 'feed',
        title: feed.displayName,
        subtitle: feed.creator?.handle ? `by @${feed.creator.handle}` : undefined,
        uri: feed.uri,
      }));

    const listResults: DiscoveryResult[] = lists.data.lists.map((list: any) => ({
      id: `list:${list.uri}`,
      kind: 'list',
      title: list.name,
      subtitle: list.creator?.handle ? `list by @${list.creator.handle}` : undefined,
      uri: list.uri,
    }));

    return [
      {
        id: `search:${trimmed}`,
        kind: 'search',
        title: `Search: ${trimmed}`,
        query: trimmed,
      },
      ...actorResults,
      ...feedResults,
      ...listResults,
    ];
  }

  async createPost(text: string, intent?: { replyTo?: FeedItem; quote?: FeedItem }, images: File[] = []): Promise<void> {
    const agent = this.requireAgent();
    const rt = new RichText({ text });
    await rt.detectFacets(agent);

    const uploadedImages = await Promise.all(
      images.map(async (image) => {
        const { data } = await agent.uploadBlob(image, { encoding: image.type });
        return {
          alt: '',
          image: data.blob,
        };
      }),
    );

    const record: any = {
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    };

    if (intent?.replyTo) {
      record.reply = {
        root: {
          uri: intent.replyTo.uri,
          cid: intent.replyTo.cid,
        },
        parent: {
          uri: intent.replyTo.uri,
          cid: intent.replyTo.cid,
        },
      };
    }

    if (intent?.quote) {
      record.embed = {
        $type: 'app.bsky.embed.record',
        record: {
          uri: intent.quote.uri,
          cid: intent.quote.cid,
        },
      };
    }

    if (uploadedImages.length > 0) {
      record.embed = {
        $type: 'app.bsky.embed.images',
        images: uploadedImages,
      };
    }

    await agent.post(record);
  }

  async like(item: FeedItem): Promise<void> {
    const agent = this.requireAgent();
    if (item.likedUri) {
      await agent.deleteLike(item.likedUri);
    } else {
      await agent.like(item.uri, item.cid ?? '');
    }
  }

  async repost(item: FeedItem): Promise<void> {
    const agent = this.requireAgent();
    if (item.repostedUri) {
      await agent.deleteRepost(item.repostedUri);
    } else {
      await agent.repost(item.uri, item.cid ?? '');
    }
  }

  async bookmark(item: FeedItem): Promise<void> {
    if (item.bookmarked) {
      await this.rawXrpc('app.bsky.bookmark.deleteBookmark', undefined, { uri: item.uri });
    } else {
      await this.rawXrpc('app.bsky.bookmark.createBookmark', undefined, { uri: item.uri, cid: item.cid });
    }
  }

  async follow(item: FeedItem): Promise<void> {
    const agent = this.requireAgent();
    if (!item.authorDid) throw new Error('This post does not include an author DID.');
    await agent.follow(item.authorDid);
  }

  async unfollow(item: FeedItem): Promise<void> {
    const agent = this.requireAgent();
    if (!item.authorFollowingUri) throw new Error('This post does not include a follow record URI.');
    await agent.deleteFollow(item.authorFollowingUri);
  }

  async deletePost(item: FeedItem): Promise<void> {
    const agent = this.requireAgent();
    await agent.deletePost(item.uri);
  }

  private requireAgent(): BskyAgent {
    if (!this.agent || !this.session) {
      throw new Error('You need to sign in first.');
    }
    return this.agent;
  }

  private async rawXrpc(method: string, params?: Record<string, string | number | undefined>, data?: unknown): Promise<any> {
    const agent = this.requireAgent();
    const query = params ? toQuery(params) : '';
    const response = await (agent as any).sessionManager.fetchHandler(`/xrpc/${method}${query}`, {
      method: data === undefined ? 'GET' : 'POST',
      headers: data === undefined ? undefined : { 'content-type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(body.message || body.error || `${method} failed with HTTP ${response.status}`);
    }
    return body;
  }
}

function mapFeedResponse(data: any): FetchResult {
  return {
    items: data.feed.map(mapFeedView).filter(Boolean) as FeedItem[],
    cursor: data.cursor,
  };
}

function uriDiscoveryResult(uri: string): DiscoveryResult {
  const collection = uri.split('/')[3];
  if (collection === 'app.bsky.graph.list') {
    return { id: `list:${uri}`, kind: 'list', title: 'List', uri };
  }
  if (collection === 'app.bsky.feed.generator') {
    return { id: `feed:${uri}`, kind: 'feed', title: 'Feed', uri };
  }
  return { id: `feed:${uri}`, kind: 'feed', title: 'AT-URI', uri };
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

export const bsky = new BskyService((session) => saveSession(session));

function sessionWithService(service: string, session: SessionData): SessionData {
  return {
    service,
    handle: session.handle,
    did: session.did,
    accessJwt: session.accessJwt,
    refreshJwt: session.refreshJwt,
    active: session.active ?? true,
  };
}

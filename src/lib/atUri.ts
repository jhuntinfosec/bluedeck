import type { DiscoveryResult } from './types';

type ParsedBskyColumnUrl = {
  kind: 'feed' | 'list';
  uri: string;
};

const collectionByPathKind: Record<ParsedBskyColumnUrl['kind'], string> = {
  feed: 'app.bsky.feed.generator',
  list: 'app.bsky.graph.list',
};

export function normalizeColumnUriInput(input: string): string {
  return parseBskyColumnUrl(input)?.uri ?? input.trim();
}

export function discoveryResultFromColumnInput(input: string): DiscoveryResult | undefined {
  const normalized = normalizeColumnUriInput(input);
  if (!normalized.startsWith('at://')) return undefined;

  const collection = normalized.split('/')[3];
  if (collection === 'app.bsky.graph.list') {
    return { id: `list:${normalized}`, kind: 'list', title: 'List', uri: normalized };
  }
  if (collection === 'app.bsky.feed.generator') {
    return { id: `feed:${normalized}`, kind: 'feed', title: 'Feed', uri: normalized };
  }
  return { id: `feed:${normalized}`, kind: 'feed', title: 'AT-URI', uri: normalized };
}

function parseBskyColumnUrl(input: string): ParsedBskyColumnUrl | undefined {
  const trimmed = input.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return undefined;
  }

  if (url.protocol !== 'https:' || url.hostname !== 'bsky.app') return undefined;

  const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (segments.length !== 4 || segments[0] !== 'profile') return undefined;

  const [, actor, pathKind, rkey] = segments;
  const kind = pathKind === 'feed' ? 'feed' : pathKind === 'lists' ? 'list' : undefined;
  if (!kind || !actor || !rkey) return undefined;

  return {
    kind,
    uri: `at://${actor}/${collectionByPathKind[kind]}/${rkey}`,
  };
}

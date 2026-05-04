import type { FeedItem } from './types';

export function mapFeedView(raw: any): FeedItem | undefined {
  const post = raw?.post ?? raw;
  const record = post?.record;
  const uri = post?.uri;
  if (!uri) return undefined;

  return {
    id: uri,
    uri,
    cid: post?.cid,
    authorDid: post?.author?.did,
    authorHandle: post?.author?.handle ?? 'unknown',
    authorName: post?.author?.displayName,
    authorAvatar: post?.author?.avatar,
    authorFollowingUri: post?.author?.viewer?.following,
    indexedAt: post?.indexedAt,
    text: typeof record?.text === 'string' ? record.text : '',
    reason: reasonLabel(raw?.reason),
    replyContext: raw?.reply?.parent?.author?.handle ? `Replying to @${raw.reply.parent.author.handle}` : undefined,
    likeCount: post?.likeCount,
    repostCount: post?.repostCount,
    replyCount: post?.replyCount,
    quoteCount: post?.quoteCount,
    likedUri: post?.viewer?.like,
    repostedUri: post?.viewer?.repost,
    bookmarked: post?.viewer?.bookmarked,
    images: extractImages(post),
    links: extractLinks(record),
    media: extractMedia(post),
    external: extractExternal(post),
    raw,
  };
}

export function mapNotification(raw: any): FeedItem | undefined {
  const uri = raw?.uri;
  if (!uri) return undefined;
  const reason = notificationReason(raw?.reason);
  return {
    id: `${uri}:${raw?.reason ?? 'notification'}:${raw?.indexedAt ?? ''}`,
    uri,
    cid: raw?.cid,
    authorDid: raw?.author?.did,
    authorHandle: raw?.author?.handle ?? 'unknown',
    authorName: raw?.author?.displayName,
    authorAvatar: raw?.author?.avatar,
    authorFollowingUri: raw?.author?.viewer?.following,
    indexedAt: raw?.indexedAt,
    text: raw?.record?.text ?? reason,
    reason,
    likeCount: raw?.likeCount,
    repostCount: raw?.repostCount,
    replyCount: raw?.replyCount,
    quoteCount: raw?.quoteCount,
    images: extractImages(raw),
    links: extractLinks(raw?.record),
    media: extractMedia(raw),
    external: extractExternal(raw),
    raw,
  };
}

export function mapThread(raw: any, selectedUri: string): FeedItem[] {
  const root = raw?.thread ?? raw;
  if (!isThreadViewPost(root)) return [];

  const parents = parentChain(root.parent).map((node) => mapThreadNode(node, selectedUri, 'Parent'));
  const selected = mapThreadNode(root, selectedUri, 'Selected post');
  const replies = flattenReplies(root.replies ?? [], selectedUri, 1);

  return [...parents, selected, ...replies].filter(Boolean) as FeedItem[];
}

function reasonLabel(reason: any): string | undefined {
  if (!reason) return undefined;
  if (reason.$type?.includes('reasonRepost')) return `Reposted by @${reason.by?.handle ?? 'someone'}`;
  return undefined;
}

function notificationReason(reason?: string): string {
  switch (reason) {
    case 'like':
      return 'liked your post';
    case 'repost':
      return 'reposted your post';
    case 'follow':
      return 'followed you';
    case 'mention':
      return 'mentioned you';
    case 'reply':
      return 'replied to you';
    case 'quote':
      return 'quoted your post';
    default:
      return reason ?? 'notification';
  }
}

function extractImages(post: any): string[] {
  const images = mediaEmbed(post?.embed)?.images;
  if (!Array.isArray(images)) return [];
  return images.map((image) => image?.thumb).filter(Boolean);
}

function extractMedia(post: any): FeedItem['media'] {
  const embed = mediaEmbed(post?.embed);
  if (Array.isArray(embed?.images)) {
    return embed.images
      .map((image: any) => ({
        type: 'image' as const,
        thumb: image.thumb,
        fullsize: image.fullsize ?? image.thumb,
        alt: image.alt,
      }))
      .filter((image: any) => image.thumb);
  }
  if (embed?.playlist) {
    return [
      {
        type: 'video',
        playlist: embed.playlist,
        thumbnail: embed.thumbnail,
        alt: embed.alt,
      },
    ];
  }
  return [];
}

function extractExternal(post: any): FeedItem['external'] {
  const external = mediaEmbed(post?.embed)?.external;
  if (!external?.uri) return undefined;
  return {
    uri: external.uri,
    title: external.title || external.uri,
    description: external.description,
    thumb: external.thumb,
  };
}

function mediaEmbed(embed: any): any {
  if (embed?.media) return embed.media;
  return embed;
}

function extractLinks(record: any): FeedItem['links'] {
  const text = typeof record?.text === 'string' ? record.text : '';
  const facetLinks = Array.isArray(record?.facets)
    ? record.facets
        .flatMap((facet: any) => {
          const link = facet?.features?.find((feature: any) => feature?.$type === 'app.bsky.richtext.facet#link' && feature?.uri);
          if (!link) return [];
          const start = byteIndexToStringIndex(text, facet.index.byteStart);
          const end = byteIndexToStringIndex(text, facet.index.byteEnd);
          return [{ text: text.slice(start, end), uri: link.uri, start, end }];
        })
        .filter((link: any) => link.text && link.uri)
    : [];

  if (facetLinks.length > 0) return facetLinks;
  return bareUrlLinks(text);
}

function bareUrlLinks(text: string): FeedItem['links'] {
  const matches = text.matchAll(/https?:\/\/[^\s<>()]+/g);
  return Array.from(matches).map((match) => ({
    text: match[0],
    uri: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
}

function byteIndexToStringIndex(text: string, byteIndex: number): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (bytes >= byteIndex) return index;
    bytes += new TextEncoder().encode(text[index]).length;
  }
  return text.length;
}

function parentChain(node: any): any[] {
  if (!isThreadViewPost(node)) return [];
  return [...parentChain(node.parent), node];
}

function flattenReplies(nodes: any[], selectedUri: string, depth: number): FeedItem[] {
  return nodes.flatMap((node) => {
    if (!isThreadViewPost(node)) return [];
    const item = mapThreadNode(node, selectedUri, depth === 1 ? 'Reply' : `Reply depth ${depth}`);
    return item ? [item, ...flattenReplies(node.replies ?? [], selectedUri, depth + 1)] : flattenReplies(node.replies ?? [], selectedUri, depth + 1);
  });
}

function mapThreadNode(node: any, selectedUri: string, context: string): FeedItem | undefined {
  const item = mapFeedView(node.post);
  if (!item) return undefined;
  return {
    ...item,
    threadContext: item.uri === selectedUri ? 'Selected post' : context,
  };
}

function isThreadViewPost(node: any): boolean {
  return Boolean(node?.post?.uri);
}

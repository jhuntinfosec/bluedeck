import { Bookmark, ExternalLink, Heart, MessageCircle, Play, Repeat2, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import type { FeedItem, FeedMedia } from '../lib/types';
import { useDeckStore } from '../store/deckStore';

type Props = {
  item: FeedItem;
};

export function PostCard({ item }: Props) {
  const openCompose = useDeckStore((state) => state.openCompose);
  const openProfile = useDeckStore((state) => state.openProfile);
  const openThread = useDeckStore((state) => state.openThread);
  const actOnPost = useDeckStore((state) => state.actOnPost);
  const actOnAuthor = useDeckStore((state) => state.actOnAuthor);
  const busyAction = useDeckStore((state) => state.busyAction);
  const session = useDeckStore((state) => state.session);
  const [activeMedia, setActiveMedia] = useState<FeedMedia>();
  const isOwnPost = item.authorHandle === session?.handle;
  const authorActionBusy = busyAction === `follow:${item.authorHandle}` || busyAction === `unfollow:${item.authorHandle}`;

  return (
    <>
      <article className="post-card" role="button" tabIndex={0} onClick={() => openThread(item)} onKeyDown={(event) => event.key === 'Enter' && openThread(item)}>
        <header className="post-author">
          <button className="author-button" title={`Open @${item.authorHandle}`} onClick={(event) => stopAndRun(event, () => openProfile(item))}>
            {item.authorAvatar ? <img src={item.authorAvatar} alt="" /> : <span className="avatar-fallback" />}
            <span>
              <strong>{item.authorName || item.authorHandle}</strong>
              <span>@{item.authorHandle}</span>
            </span>
          </button>
          {!isOwnPost && item.authorDid ? (
            <button
              className={`follow-button ${item.authorFollowingUri ? 'following' : ''}`}
              disabled={authorActionBusy}
              onClick={(event) =>
                stopAndRun(event, () => {
                  if (item.authorFollowingUri) {
                    if (window.confirm(`Unfollow @${item.authorHandle}?`)) void actOnAuthor('unfollow', item);
                  } else {
                    void actOnAuthor('follow', item);
                  }
                })
              }
            >
              {item.authorFollowingUri ? 'Following' : 'Follow'}
            </button>
          ) : null}
          {item.indexedAt ? <time>{new Date(item.indexedAt).toLocaleString()}</time> : null}
        </header>
        {item.reason ? <p className="post-context">{item.reason}</p> : null}
        {item.threadContext ? <p className="thread-context">{item.threadContext}</p> : null}
        {item.replyContext ? <p className="post-context">{item.replyContext}</p> : null}
        <PostText item={item} />
        {item.media.length > 0 ? (
          <div className="image-grid">
            {item.media.map((media) => (
              <button key={mediaKey(media)} className="media-tile" onClick={(event) => stopAndRun(event, () => setActiveMedia(media))}>
                {media.type === 'image' ? <img src={media.thumb} alt={media.alt ?? ''} /> : <VideoThumb media={media} />}
              </button>
            ))}
          </div>
        ) : null}
        {item.external ? <ExternalCard item={item} /> : null}
        <footer className="post-actions">
          <button title="Reply" onClick={(event) => stopAndRun(event, () => openCompose({ mode: 'reply', item }))}>
            <MessageCircle size={16} />
            {item.replyCount ?? 0}
          </button>
          <button title="Repost" className={item.repostedUri ? 'active' : ''} onClick={(event) => stopAndRun(event, () => void actOnPost('repost', item))}>
            <Repeat2 size={16} />
            {item.repostCount ?? 0}
          </button>
          <button title="Like" className={item.likedUri ? 'active' : ''} onClick={(event) => stopAndRun(event, () => void actOnPost('like', item))}>
            <Heart size={16} />
            {item.likeCount ?? 0}
          </button>
          <button title="Bookmark" className={item.bookmarked ? 'active' : ''} onClick={(event) => stopAndRun(event, () => void actOnPost('bookmark', item))}>
            <Bookmark size={16} />
          </button>
          <button title="Quote" onClick={(event) => stopAndRun(event, () => openCompose({ mode: 'quote', item }))}>
            <Upload size={16} />
          </button>
          <a title="Open in Bluesky" href={postUrl(item)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
            <ExternalLink size={16} />
          </a>
          {isOwnPost ? (
            <button title="Delete post" onClick={(event) => stopAndRun(event, () => window.confirm('Delete this post?') && void actOnPost('delete', item))}>
              <Trash2 size={16} />
            </button>
          ) : null}
        </footer>
      </article>
      {activeMedia ? <MediaLightbox media={activeMedia} onClose={() => setActiveMedia(undefined)} /> : null}
    </>
  );
}

function PostText({ item }: { item: FeedItem }) {
  const segments = useMemo(() => textSegments(item.text, item.links), [item.text, item.links]);
  return (
    <p className="post-text">
      {segments.map((segment) =>
        segment.uri ? (
          <a key={`${segment.start}:${segment.end}`} href={segment.uri} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
            {segment.text}
          </a>
        ) : (
          <span key={`${segment.start}:${segment.end}`}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

function ExternalCard({ item }: { item: FeedItem }) {
  if (!item.external) return null;
  return (
    <a className="external-card" href={item.external.uri} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
      {item.external.thumb ? <img src={item.external.thumb} alt="" /> : null}
      <span>
        <strong>{item.external.title}</strong>
        {item.external.description ? <small>{item.external.description}</small> : null}
      </span>
    </a>
  );
}

function VideoThumb({ media }: { media: Extract<FeedMedia, { type: 'video' }> }) {
  return (
    <span className="video-thumb">
      {media.thumbnail ? <img src={media.thumbnail} alt={media.alt ?? ''} /> : null}
      <span>
        <Play size={24} />
      </span>
    </span>
  );
}

function MediaLightbox({ media, onClose }: { media: FeedMedia; onClose: () => void }) {
  return (
    <div className="media-backdrop" onClick={onClose}>
      <section className="media-dialog" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button media-close" title="Close media" onClick={onClose}>
          <X size={18} />
        </button>
        {media.type === 'image' ? <img src={media.fullsize} alt={media.alt ?? ''} /> : <HlsVideo media={media} />}
      </section>
    </div>
  );
}

function HlsVideo({ media }: { media: Extract<FeedMedia, { type: 'video' }> }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = media.playlist;
      return;
    }
    if (!Hls.isSupported()) {
      video.src = media.playlist;
      return;
    }
    const hls = new Hls();
    hls.loadSource(media.playlist);
    hls.attachMedia(video);
    return () => hls.destroy();
  }, [media.playlist]);

  return <video ref={ref} poster={media.thumbnail} controls autoPlay playsInline />;
}

function stopAndRun(event: React.MouseEvent, action: () => void): void {
  event.stopPropagation();
  action();
}

function textSegments(text: string, links: FeedItem['links']) {
  const sorted = links
    .filter((link) => link.start >= 0 && link.end <= text.length && link.start < link.end)
    .sort((a, b) => a.start - b.start);
  const segments: Array<{ text: string; start: number; end: number; uri?: string }> = [];
  let cursor = 0;
  for (const link of sorted) {
    if (link.start < cursor) continue;
    if (link.start > cursor) segments.push({ text: text.slice(cursor, link.start), start: cursor, end: link.start });
    segments.push({ text: text.slice(link.start, link.end), start: link.start, end: link.end, uri: link.uri });
    cursor = link.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), start: cursor, end: text.length });
  return segments.length ? segments : [{ text, start: 0, end: text.length }];
}

function mediaKey(media: FeedMedia): string {
  return media.type === 'image' ? media.fullsize : media.playlist;
}

function postUrl(item: FeedItem): string {
  const id = item.uri.split('/').pop();
  return `https://bsky.app/profile/${item.authorHandle}/post/${id}`;
}

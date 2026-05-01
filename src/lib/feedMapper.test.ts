import { describe, expect, it } from 'vitest';
import { mapFeedView, mapNotification } from './feedMapper';

describe('feedMapper', () => {
  it('maps a feed view post into renderable data', () => {
    const item = mapFeedView({
      post: {
        uri: 'at://did/app.bsky.feed.post/abc',
        cid: 'cid',
        author: { handle: 'alice.test', displayName: 'Alice' },
        record: { text: 'hello' },
        viewer: { like: 'like-uri', bookmarked: true },
      },
    });

    expect(item).toMatchObject({
      uri: 'at://did/app.bsky.feed.post/abc',
      authorHandle: 'alice.test',
      authorName: 'Alice',
      text: 'hello',
      likedUri: 'like-uri',
      bookmarked: true,
    });
  });

  it('maps notification reasons', () => {
    const item = mapNotification({
      uri: 'at://did/app.bsky.feed.post/abc',
      author: { handle: 'bob.test' },
      reason: 'reply',
      record: { text: 'response' },
    });

    expect(item?.reason).toBe('replied to you');
    expect(item?.text).toBe('response');
  });
});

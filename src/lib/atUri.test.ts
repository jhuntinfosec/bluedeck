import { describe, expect, it } from 'vitest';
import { discoveryResultFromColumnInput, normalizeColumnUriInput } from './atUri';

describe('Bluesky column URI normalization', () => {
  it('normalizes bsky.app DID list links to list AT-URIs', () => {
    expect(normalizeColumnUriInput('https://bsky.app/profile/did:plc:gvd47m7msfjm5vbt7fpcbmmw/lists/3mgxamdoxc524')).toBe(
      'at://did:plc:gvd47m7msfjm5vbt7fpcbmmw/app.bsky.graph.list/3mgxamdoxc524',
    );
  });

  it('normalizes bsky.app handle feed links to feed AT-URIs', () => {
    expect(normalizeColumnUriInput('https://bsky.app/profile/bsky.app/feed/whats-hot')).toBe(
      'at://bsky.app/app.bsky.feed.generator/whats-hot',
    );
  });

  it('creates discovery results for pasted Bluesky list links', () => {
    expect(discoveryResultFromColumnInput('https://bsky.app/profile/alice.test/lists/3abc')).toEqual({
      id: 'list:at://alice.test/app.bsky.graph.list/3abc',
      kind: 'list',
      title: 'List',
      uri: 'at://alice.test/app.bsky.graph.list/3abc',
    });
  });

  it('keeps unsupported input unchanged', () => {
    expect(normalizeColumnUriInput('alice.test')).toBe('alice.test');
    expect(discoveryResultFromColumnInput('alice.test')).toBeUndefined();
  });
});

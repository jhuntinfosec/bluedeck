import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionData } from './types';

const { agents } = vi.hoisted(() => ({
  agents: [] as any[],
}));

vi.mock('@atproto/api', () => {
  class MockBskyAgent {
    session?: SessionData;

    constructor(private readonly options: { service: string; persistSession?: (event: string, session?: SessionData) => void }) {
      agents.push(this);
    }

    async login() {
      this.session = {
        service: this.options.service,
        handle: 'alice.test',
        did: 'did:plc:alice',
        accessJwt: 'access',
        refreshJwt: 'refresh',
        active: true,
      };
      this.options.persistSession?.('create', this.session);
      return { data: this.session };
    }

    async resumeSession(session: SessionData) {
      if (session.accessJwt === 'bad') {
        this.session = undefined;
        this.options.persistSession?.('expired', undefined);
        throw new Error('ExpiredToken');
      }
      this.session = { ...session, accessJwt: 'fresh-access', refreshJwt: 'fresh-refresh' };
      this.options.persistSession?.('update', this.session);
      return { data: this.session };
    }
  }

  return {
    BskyAgent: MockBskyAgent,
    RichText: class {},
  };
});

import { BskyService } from './bsky';

describe('BskyService session persistence', () => {
  beforeEach(() => {
    agents.length = 0;
  });

  it('persists SDK session updates with the service URL attached', async () => {
    const changes: Array<SessionData | undefined> = [];
    const service = new BskyService((session) => changes.push(session));

    const session = await service.login({
      service: 'https://bsky.social',
      identifier: 'alice.test',
      password: 'app-password',
    });

    expect(session.service).toBe('https://bsky.social');
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      service: 'https://bsky.social',
      accessJwt: 'access',
      refreshJwt: 'refresh',
    });
  });

  it('clears persisted session data when resume fails as expired', async () => {
    const changes: Array<SessionData | undefined> = [];
    const service = new BskyService((session) => changes.push(session));

    await expect(
      service.resume({
        service: 'https://bsky.social',
        handle: 'alice.test',
        did: 'did:plc:alice',
        accessJwt: 'bad',
        refreshJwt: 'refresh',
        active: true,
      }),
    ).rejects.toThrow('ExpiredToken');

    expect(changes).toEqual([undefined]);
    expect(agents).toHaveLength(1);
  });
});

# Bluedeck

Bluedeck is a local-first, TweetDeck-style web app for Bluesky. It gives you a dense multi-column dashboard for reading timelines, notifications, feeds, lists, bookmarks, profiles, searches, and post threads from one browser window.

This is an early local tool, not a hosted service. Credentials and layout state are stored in your browser on the machine where you run it.

## Features

- App-password sign-in for Bluesky.
- Multi-column dashboard with resize, reorder, refresh, and remove controls.
- Columns for home timeline, notifications, search, custom feeds, lists, profile timelines, bookmarks, and post threads.
- Manual and example feed/list column creation.
- Post actions: reply, quote, repost, like, bookmark, delete your own posts, and open in Bluesky.
- Thread columns when you click a post.
- Clickable post links and external link cards.
- Image and video lightbox with playback controls.
- Browser-local persistence for session and column layout.

## Requirements

- Node.js 22 or newer is recommended.
- npm.
- A Bluesky account.
- A Bluesky app password for login.

Create an app password in Bluesky under:

`Settings -> Privacy and security -> App passwords`

Use an app password, not your main account password.

## Install

```bash
git clone <repo-url>
cd bluedeck
npm install
```

If you want to run the Playwright browser smoke test:

```bash
npx playwright install chromium
```

## Run Locally

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

`http://127.0.0.1:5173/`

Sign in with:

- Service: `https://bsky.social`
- Handle or email: your Bluesky handle or account email
- App password: a Bluesky app password

## Usage Notes

Use the `+` button to add columns. Built-in column types include home, notifications, bookmarks, search, feed URI, list URI, and profile.

For feeds and lists, Bluedeck expects AT-URIs:

```text
at://did:plc:.../app.bsky.feed.generator/...
at://did:plc:.../app.bsky.graph.list/...
```

The add-column dialog includes working examples:

- Bluesky Discover feed
- Bluesky Community Showcase list

To find your own feed URIs:

```bash
curl "https://public.api.bsky.app/xrpc/app.bsky.feed.getActorFeeds?actor=YOUR_HANDLE"
```

To find your own list URIs:

```bash
curl "https://public.api.bsky.app/xrpc/app.bsky.graph.getLists?actor=YOUR_HANDLE"
```

Use the `uri` field from the response.

Click a post card to open its thread in a new column. Click links, image thumbnails, or video thumbnails to open those targets directly without opening a thread.

## Scripts

```bash
npm run dev       # Start the local Vite dev server
npm run build     # Type-check and build production assets
npm test          # Run Vitest unit/component tests
npm run test:e2e  # Run Playwright smoke tests
npm run check     # Run build, unit tests, and e2e tests
```

## Gotchas

- Bluedeck stores session tokens in browser `localStorage`. This is acceptable for a personal local tool, but it is not a production-grade auth model for a hosted app.
- Use a Bluesky app password. Do not use your main password.
- Bookmarks use raw XRPC calls because the installed `@atproto/api` version does not expose the bookmark namespace yet.
- Feed discovery in the UI is intentionally basic. Direct AT-URI paste is the most reliable way to add exact feeds/lists.
- Starter packs are not currently supported as columns.
- The production bundle is currently large because this is a single-page app with the Bluesky SDK and video playback support bundled together.

## Development

The app is structured around a few small layers:

- `src/lib/bsky.ts`: Bluesky API wrapper.
- `src/lib/feedMapper.ts`: Maps Bluesky API responses into renderable post data.
- `src/store/deckStore.ts`: Zustand state for session, columns, runtime data, compose, and actions.
- `src/ui/`: React UI components.

Before sharing changes, run:

```bash
npm run check
```

## License

MIT. See [LICENSE](./LICENSE).

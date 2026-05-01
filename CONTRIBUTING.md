# Contributing

Bluedeck is currently a local-first Bluesky dashboard. Keep changes focused, easy to run locally, and consistent with the existing React/TypeScript structure.

## Local Setup

```bash
npm install
npm run dev
```

For Playwright tests:

```bash
npx playwright install chromium
```

## Checks

Run this before opening a pull request:

```bash
npm run check
```

## Notes

- Do not commit real credentials, app passwords, screenshots with private account data, or local browser storage.
- Prefer small API wrapper changes in `src/lib/bsky.ts` over direct SDK calls from components.
- Keep post-shape normalization in `src/lib/feedMapper.ts`.
- Keep generated outputs such as `dist/`, `coverage/`, `test-results/`, and `playwright-report/` out of git.

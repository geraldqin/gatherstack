# GatherStack

Use AI to parse web pages, extract fields with Skills, and store results in your browser for later summarization and comparison.

Full product overview: [ABOUT.md](./ABOUT.md). 中文：[README_cn.md](./README_cn.md) · [ABOUT_cn.md](./ABOUT_cn.md).

This repo is a [Plasmo](https://docs.plasmo.com/) Chrome extension (Manifest V3).

## Getting Started

Install dependencies and start the dev server:

```bash
pnpm install
pnpm dev
# or
npm install
npm run dev
```

Open `chrome://extensions` in Chrome, enable Developer mode, and load `build/chrome-mv3-dev`.

Main entry points:

- Side panel: `src/sidepanel.tsx`
- Options page: `src/options.tsx`

Edits usually hot-reload; if the side panel or background script does not refresh, click Reload on the extensions page.

More framework details: [Plasmo docs](https://docs.plasmo.com/).

## Making production build

```bash
pnpm build
# or
npm run build
```

Output is in `build/chrome-mv3-prod`.

Optional:

```bash
pnpm package
```

---
title: 'Hello, World'
description: 'A first post to verify the blog pipeline works end-to-end — build, RSS, sitemap, terminal `blog` and `search` commands.'
pubDate: 2026-06-16
tags: ['meta', 'test']
draft: false
---

This is a sanity-check post used to verify that the build pipeline is wired up correctly. If you can read it on the deployed site, the static generator, RSS feed, sitemap, and the terminal's `blog` and `search` commands are all working.

## Markdown

- Bullet lists render.
- **Bold** and *italic* text render.
- `inline code` and fenced code blocks render with Shiki highlighting.

```ts
function greet(name: string): string {
  return `hello, ${name}!`;
}

console.log(greet('oSthing'));
```

> A short blockquote just to make sure that path is exercised too.

If anything looks off, the most likely culprit is a stale `dist/` — run `npm run build` again to refresh it.

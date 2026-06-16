# Cyber Terminal Blog

A minimalist, terminal-driven personal blog. Built with Astro, TypeScript, TailwindCSS, and xterm.js.

- **Live demo:** https://example.com
- **Stack:** Astro 5 · TypeScript · TailwindCSS · xterm.js
- **Deploy:** GitHub Pages

## Features

- Interactive terminal UI on the home page with a virtual filesystem
- Twelve built-in commands: `help`, `clear`, `ls`, `pwd`, `cd`, `cat`, `whoami`, `blog`, `projects`, `contact`, `theme`, `search`
- Markdown content via Astro Content Collections
- Reading time, tag chips, table of contents on each post
- Auto-generated RSS feed and sitemap
- Light / dark / system theme with no FOUC
- Fully static — no server, no database

## Local development

```bash
# install
npm install

# dev server (http://localhost:4321)
npm run dev

# production build → ./dist
npm run build

# preview the production build
npm run preview

# type / content checks
npm run check
```

## Project layout

```
src/
├── components/        # Header, Footer, ThemeToggle, PostCard, TableOfContents, ThemeScript
├── content/blog/      # Markdown posts (auto-registered)
├── layouts/           # BaseLayout, BlogLayout
├── pages/             # Routes incl. rss.xml.ts and sitemap.xml.ts
├── scripts/           # terminal.ts, commands.ts, filesystem.ts, store.ts
└── styles/global.css  # Tailwind entry + custom CSS variables
```

## Writing a post

Create a Markdown file in `src/content/blog/` with the following frontmatter:

```markdown
---
title: 'Your post title'
description: 'One-sentence summary.'
pubDate: 2026-06-15
tags: ['topic-a', 'topic-b']
draft: false
---

Your content here.
```

The post is automatically registered. It will show up:

- in the `blog` command on the home terminal,
- in the `/blog` listing page,
- in the RSS feed,
- in the sitemap,
- and in the `search` command's index.

## Terminal commands

| Command | Description |
| --- | --- |
| `help` | List every command with a short description. |
| `clear` | Clear the screen. |
| `ls [path]` | List the current (or given) directory. |
| `pwd` | Print the current working directory. |
| `cd <path>` | Change directory. Supports `.`, `..`, and absolute paths. |
| `cat <file>` | Print a file's contents. |
| `whoami` | Short bio. |
| `blog [slug]` | List all posts, or open a specific one. |
| `projects` | List projects. |
| `contact` | Show contact information. |
| `theme <light\|dark\|system>` | Switch theme. |
| `search <query>` | Search post titles, descriptions, bodies, and tags. |

Use ↑ / ↓ to walk through command history.

## Deployment

The repository ships with a GitHub Actions workflow at `.github/workflows/deploy.yml` that:

1. Installs dependencies (`npm ci`),
2. Builds the static site (`npm run build`),
3. Publishes `dist/` to GitHub Pages.

To enable:

1. Push this repository to GitHub.
2. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. Subsequent pushes redeploy automatically.

### Project pages (sub-path)

If your repository is `you/terminal-blog` and you want to serve at `you.github.io/terminal-blog/`:

1. Add a workflow variable `ASTRO_BASE: /terminal-blog` and update the build step to `ASTRO_BASE=$ASTRO_BASE npm run build`.
2. In `astro.config.mjs`, set `base: '/terminal-blog'`.
3. In `public/robots.txt`, update the sitemap URL.

## Customization

- **Site metadata:** edit `src/consts.ts` (title, description, social links).
- **Colors:** adjust the CSS variables in `src/styles/global.css` and `tailwind.config.mjs`.
- **Navigation:** add or remove entries in `src/consts.ts → NAV`.
- **Terminal output:** edit `src/scripts/commands.ts`.

## License

MIT — see `LICENSE`.

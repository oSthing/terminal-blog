# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A minimalist, terminal-driven personal blog. Static site, no server, no database. Deployed to GitHub Pages via `.github/workflows/deploy.yml`.

**Stack:** Astro 5 · TypeScript (strict) · TailwindCSS 3 · Shiki (markdown highlighting) · remark-gfm

`xterm` / `xterm-addon-fit` / `xterm-addon-web-links` are listed in `package.json` and pinned in `astro.config.mjs` for SSR, but the on-screen terminal is intentionally implemented as **plain HTML** (see "Terminal subsystem" below) — do not introduce xterm.js usage when adding features.

## Commands

```bash
npm install            # install dependencies
npm run dev            # dev server at http://localhost:4321
npm run build          # production build → ./dist (static output)
npm run preview        # serve the built site locally
npm run check          # astro check (TypeScript + content collection schema)
npm run format         # prettier on src/**/*.{ts,astro,md}
```

There is no test runner — `npm run check` is the closest thing to a CI gate.

## Architecture

### Routing & pages (`src/pages/`)
File-based Astro routes. Static endpoints: `/`, `/blog`, `/blog/[...slug]`, `/projects`, `/about`, `/contact`. Generated endpoints: `/rss.xml` (`rss.xml.ts`, uses `@astrojs/rss`) and `/sitemap.xml` (`sitemap.xml.ts`, hand-rolled XML, no `@astrojs/sitemap` runtime — the integration only registers discovery metadata).

### Content (`src/content/blog/`)
Markdown posts registered as a `blog` Content Collection. Schema enforced in `src/content/config.ts`: `title`, `description`, `pubDate`, optional `updatedDate`, `tags[]` (default `[]`), `draft` (default `false`). Posts with `draft: true` are filtered out of listings, RSS, sitemap, and the terminal's `blog`/`search` commands.

### Layouts (`src/layouts/`)
- `BaseLayout.astro` — html shell, head meta (OG, Twitter, canonical, RSS alternate, Inter + JetBrains Mono webfonts), Header/Footer, mounts `ThemeScript` first to prevent FOUC. Accepts `showTerminal` prop to render a "→ launch terminal" link in the header.
- `BlogLayout.astro` — wraps a single post: header (date + reading time + tags), two-column body (`prose` + sticky `TableOfContents`), back link. Reading time = `round(wordCount / 220)`, min 1 min.

### Terminal subsystem (home page only)

Four files under `src/scripts/`, all client-side. `Terminal.astro` is the host component; `terminal.ts` mounts everything.

- **`filesystem.ts`** — `VirtualFileSystem` class over a tree of `FsDirectory` / `FsFile` nodes. POSIX-style paths, supports `.`, `..`, absolute paths. No mutation API — it's read-only.
- **`store.ts`** — Tiny `Store<T>` pub/sub holding `TerminalState { cwd, history }`. Single module-level instance (`terminalStore`).
- **`commands.ts`** — Command registry. Each `CommandSpec` has `name`, `description`, optional `usage`, and `run(args, ctx)`. `parse()` is a quoted-string-aware splitter. `run()` is the entry point used by `terminal.ts`. Commands emit ANSI-styled strings via `color()`, `heading()`, `link()` helpers; `terminal.ts` converts ANSI to HTML at write time.
- **`terminal.ts`** — Plain-HTML terminal (real `<input>` + scrollable `<div>`). No xterm.js. ANSI→HTML converter supports SGR 0/1/4/30–37/38;5;n/90–97. Mount is idempotent via a `WeakSet<HTMLElement>`. Captures ↑/↓ history nav, `Ctrl+L` clear, `Ctrl+C` abort. Steals focus on any printable keypress outside the terminal (so the input always feels "live").

Posts are passed across the SSR→client boundary as JSON in a `data-posts` attribute on `#terminal-host` (server-side caps each post body at 2000 chars via `lightweightPosts` in `Terminal.astro` to keep the initial HTML small). The mount script parses the attribute and calls `mountTerminal`.

Adding a command: append a new `CommandSpec` to the `COMMANDS` array in `commands.ts`. It will automatically appear in `help` (the list is sourced from `commands`).

### Theme system

- `src/components/ThemeScript.astro` — inline blocking script in `<head>`, reads `localStorage.theme` then `prefers-color-scheme`, toggles `.dark` on `<html>`. Runs before paint → no FOUC.
- `src/components/ThemeToggle.astro` — header button; flips `.dark` and persists. Hardcoded as a binary toggle (the `theme` terminal command is more granular).
- `src/scripts/commands.ts` → `theme` command — supports `light` / `dark` / `system` and writes/removes `localStorage.theme` accordingly.

Tokens live as CSS variables in `src/styles/global.css` (`:root` / `:root.dark`) and as Tailwind color aliases (`bg.*`, `fg.*`, `muted.*`, `border.*`, `accent.*`) in `tailwind.config.mjs`. Keep both in sync when changing palette.

## Path aliases (from `tsconfig.json`)

`@/*` → `src/*`, plus `@components/*`, `@layouts/*`, `@scripts/*`, `@styles/*`. Use these in `.astro` frontmatter imports.

## Site-wide configuration

`src/consts.ts` exports three frozen objects used everywhere:
- `SITE` — title, tagline, description, author, email, qq, github, twitter, url, locale, language
- `NAV` — header nav items (`{ href, label }`)
- `SOCIAL` — header social links (`{ href, label }`)

Edit these once; both the UI and the RSS/sitemap endpoints pick up the changes.

## Deployment

GitHub Actions workflow at `.github/workflows/deploy.yml` builds on push to `main` and publishes `dist/` via `actions/deploy-pages`. For project-page hosting (e.g. `user.github.io/repo/`), set the `ASTRO_BASE` env var and update `astro.config.mjs` `base` plus `public/robots.txt`.

## Conventions

- Tailwind dark mode is class-based (`darkMode: 'class'`). Always pair colors: `bg-bg-light dark:bg-bg-dark`, etc.
- New posts drop into `src/content/blog/` and surface automatically in `/blog`, RSS, sitemap, and the terminal's `blog` / `search` commands.
- Markdown code blocks are highlighted by Shiki with theme `github-dark-dimmed`. `astro.config.mjs` restricts Shiki to a small language set to keep the install small — extend `SHIKI_LANGS` if a new language is needed.
- Keep terminal output as ANSI strings returned from commands; let `terminal.ts`'s converter render them. Don't `innerHTML` raw user input in components.

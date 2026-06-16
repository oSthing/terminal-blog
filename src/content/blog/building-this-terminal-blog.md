---
title: 'Building this terminal blog'
description: 'How a minimal Astro site with xterm.js became my writing home — design notes, tradeoffs, and the small details that matter.'
pubDate: 2026-04-12
tags: ['astro', 'xterm', 'design', 'meta']
---

I rewrote my blog four times before settling on this version. Each iteration taught me something, but the throughline is the same: a personal site should feel personal. Mine happens to feel like a terminal — because that is the interface I actually live in.

## Why a terminal UI

Most blog homepages front-load metadata: latest post, tag cloud, author photo, RSS link. None of that is what I want when I open a blog. I want to read. The terminal is the inverse — it gives me a single, quiet surface and lets me ask for what I need.

```bash
$ blog
2026-04-12  Building this terminal blog
             → /blog/building-this-terminal-blog
2026-03-02  Cryptography fundamentals
             → /blog/cryptography-fundamentals
```

## Stack

Astro for static generation and content collections. Tailwind for styling. xterm.js for the actual terminal — it handles input, history, and rendering for free. No backend, no database. Markdown files in a folder become posts.

> If your blog needs a server to render, you have already lost.
> — every site I've shipped

## The boot sequence

The first thing you see is a few lines that pretend to load:

```
oSthing's blog v1.0
Ciallo～(∠・ω< )⌒☆
type help to list commands. > is the prompt.
```

It is theatre. The page is already interactive. But the theatre tells you what kind of place you are in, the way a door tells you whether you are entering a library or a gym.

## Open questions

- Should `cd` accept `~`? Right now it does, but only as a synonym for `/`.
- Should `search` rank by relevance or recency? Currently it lists in insertion order.
- Should the theme toggle remember per-page state, or be global? Global wins for predictability.

If you have opinions, the contact page is one click away.

/**
 * Command registry + implementations for the in-browser terminal.
 *
 * `run(input)` is the entry point — it parses the input, finds the command,
 * and returns the formatted output (or `null` for silent success).
 *
 * `commands` is exposed so the `help` command can list names + descriptions.
 */

import type { VirtualFileSystem } from './filesystem';
import { terminalStore } from './store';
import type { Friend } from '../data/friends';

export interface CommandContext {
  fs: VirtualFileSystem;
  posts: PostSummary[];
  friends: Friend[];
}

export interface PostSummary {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  tags: string[];
  body: string;
}

export interface CommandSpec {
  name: string;
  description: string;
  usage?: string;
  run: (args: string[], ctx: CommandContext) => string | null | Promise<string | null>;
}

const OK = (s: string) => s;
const HELP_TEXT = `Available commands:

  help              show this help
  clear             clear the screen
  ls [path]         list directory contents
  pwd               print current working directory
  cd <path>         change directory
  cat <file>        print file contents
  whoami            short bio
  blog [slug]       list posts or open one
  projects          list projects
  friends           list friend links
  contact           show contact info
  theme <mode>      light | dark | system
  search <query>    search post titles and content

Tip: use ↑/↓ to navigate history.`;

function color(text: string): string {
  // ANSI escape: subtle muted styling so output reads like a real shell.
  return `\x1b[38;5;245m${text}\x1b[0m`;
}

function heading(text: string): string {
  return `\x1b[1m${text}\x1b[0m`;
}

function link(text: string, href: string): string {
  return `\x1b[4m${href}\x1b[0m  ${color(text)}`;
}

const COMMANDS: CommandSpec[] = [
  {
    name: 'help',
    description: 'show available commands',
    run: () => HELP_TEXT,
  },
  {
    name: 'clear',
    description: 'clear the terminal screen',
    run: () => null,
  },
  {
    name: 'pwd',
    description: 'print current working directory',
    run: () => terminalStore.get().cwd,
  },
  {
    name: 'ls',
    description: 'list files in a directory',
    usage: 'ls [path]',
    run: (args, ctx) => {
      const target = args[0] ? ctx.fs.resolve(terminalStore.get().cwd, args[0]) : terminalStore.get().cwd;
      if (!ctx.fs.exists(target)) return `ls: cannot access '${args[0] ?? target}': no such file or directory`;
      if (!ctx.fs.isDir(target)) return args[0] ?? target;
      const children = ctx.fs.list(target)!;
      if (children.length === 0) return '';
      return children
        .map((c) => (c.type === 'dir' ? color(`${c.name}/`) : c.name))
        .join('  ');
    },
  },
  {
    name: 'cd',
    description: 'change directory',
    usage: 'cd <path>',
    run: (args, ctx) => {
      const target = args[0] ?? '/';
      if (target === '~') {
        terminalStore.set((s) => ({ ...s, cwd: '/' }));
        return null;
      }
      const next = ctx.fs.resolve(terminalStore.get().cwd, target);
      if (!ctx.fs.exists(next)) return `cd: no such file or directory: ${target}`;
      if (!ctx.fs.isDir(next)) return `cd: not a directory: ${target}`;
      terminalStore.set((s) => ({ ...s, cwd: next }));
      return null;
    },
  },
  {
    name: 'cat',
    description: 'print file contents',
    usage: 'cat <file>',
    run: (args, ctx) => {
      if (args.length === 0) return 'cat: missing file operand';
      const target = ctx.fs.resolve(terminalStore.get().cwd, args[0]);
      if (!ctx.fs.exists(target)) return `cat: ${args[0]}: no such file or directory`;
      if (ctx.fs.isDir(target)) return `cat: ${args[0]}: is a directory`;
      return ctx.fs.read(target) ?? '';
    },
  },
  {
    name: 'whoami',
    description: 'short bio',
    run: () =>
      [
        heading('oSthing'),
        '',
        'nobody in particular, mostly learning security.',
        'i write notes, run experiments, and build small tools.',
        '',
        color('tip: type `cat about.txt` for the rest, or open /about.'),
      ].join('\n'),
  },
  {
    name: 'blog',
    description: 'list posts or open a specific slug',
    usage: 'blog [slug]',
    run: (args, ctx) => {
      if (args.length === 0) {
        if (ctx.posts.length === 0) return 'no posts yet.';
        const lines = [heading('posts'), ''];
        for (const post of ctx.posts) {
          const date = new Date(post.pubDate).toISOString().slice(0, 10);
          lines.push(`  ${color(date)}  ${post.title}`);
          lines.push(`  ${color('→')} /blog/${post.slug}`);
          lines.push('');
        }
        lines.push(color('usage: blog <slug>  e.g.  blog ' + ctx.posts[0].slug));
        return lines.join('\n');
      }
      const slug = args[0];
      const post = ctx.posts.find((p) => p.slug === slug);
      if (!post) return `blog: post not found: ${slug}`;
      return [
        heading(post.title),
        '',
        color(post.description),
        '',
        `${color('date')}   ${new Date(post.pubDate).toDateString()}`,
        `${color('tags')}   ${post.tags.join(', ') || '—'}`,
        '',
        link('open in browser', `/blog/${post.slug}`),
      ].join('\n');
    },
  },
  {
    name: 'projects',
    description: 'list projects',
    run: () =>
      [
        heading('projects'),
        '',
        `  ${color('•')} terminal-blog          ${color('this site — astro + plain html')}`,
        `  ${color('•')} cryptopals             ${color('matasano crypto challenges in rust')}`,
        `  ${color('•')} zero-trust-lab         ${color('home lab with opa + spiffe')}`,
        `  ${color('•')} papertrade             ${color('event-driven backtester')}`,
        '',
        color('see /projects for details.'),
      ].join('\n'),
  },
  {
    name: 'friends',
    description: 'list friend links',
    run: (_, ctx) => {
      if (ctx.friends.length === 0) return 'no friends yet.';
      const lines = [heading('friends'), ''];
      for (const friend of ctx.friends) {
        lines.push(`  ${color('•')} ${friend.name}  ${color(friend.url)}`);
        lines.push(`    ${color(friend.description)}`);
        lines.push('');
      }
      const n = ctx.friends.length;
      lines.push(color(`see /links for the full list. (${n} link${n === 1 ? '' : 's'})`));
      return lines.join('\n');
    },
  },
  {
    name: 'contact',
    description: 'show contact info',
    run: () =>
      [
        heading('contact'),
        '',
        `  ${color('email')}    osthinggg@gmail.com`,
        `  ${color('qq')}       2865934604`,
        `  ${color('github')}   https://github.com/oSthing`,
        `  ${color('rss')}      /rss.xml`,
        '',
        color('or open the /contact page in your browser.'),
      ].join('\n'),
  },
  {
    name: 'theme',
    description: 'switch theme',
    usage: 'theme <light|dark|system>',
    run: (args) => {
      const mode = args[0];
      const root = document.documentElement;
      if (mode === 'dark') {
        root.classList.add('dark');
        try { localStorage.setItem('theme', 'dark'); } catch { /* no-op */ }
        return 'theme → dark';
      }
      if (mode === 'light') {
        root.classList.remove('dark');
        try { localStorage.setItem('theme', 'light'); } catch { /* no-op */ }
        return 'theme → light';
      }
      if (mode === 'system' || mode === undefined) {
        try { localStorage.removeItem('theme'); } catch { /* no-op */ }
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
        return 'theme → system';
      }
      return `theme: unknown mode '${mode}' (try: light, dark, system)`;
    },
  },
  {
    name: 'search',
    description: 'search posts by title or content',
    usage: 'search <query>',
    run: (args, ctx) => {
      const query = args.join(' ').trim().toLowerCase();
      if (!query) return 'search: provide a query. usage: search <query>';
      const matches = ctx.posts.filter((p) => {
        const haystack = `${p.title}\n${p.description}\n${p.body}\n${p.tags.join(' ')}`.toLowerCase();
        return haystack.includes(query);
      });
      if (matches.length === 0) return `search: no results for "${query}"`;
      const lines = [heading(`${matches.length} match${matches.length === 1 ? '' : 'es'} for "${query}"`), ''];
      for (const post of matches) {
        lines.push(`  ${post.title}`);
        lines.push(`  ${color('→')} /blog/${post.slug}`);
        lines.push('');
      }
      return lines.join('\n');
    },
  },
];

export const commands: Record<string, CommandSpec> = Object.fromEntries(
  COMMANDS.map((c) => [c.name, c]),
);

export interface ParsedCommand {
  name: string;
  args: string[];
}

export function parse(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.match(/(?:"[^"]*"|'[^']*'|\S+)/g) ?? [];
  if (parts.length === 0) return null;
  const [name, ...args] = parts;
  return {
    name: name.toLowerCase(),
    args: args.map((a) => a.replace(/^['"]|['"]$/g, '')),
  };
}

export async function run(input: string, ctx: CommandContext): Promise<string | null> {
  const parsed = parse(input);
  if (!parsed) return null;

  const command = commands[parsed.name];
  if (!command) {
    return `command not found: ${parsed.name}. try \`help\`.`;
  }

  const result = await command.run(parsed.args, ctx);
  return result;
}

export function listCommandsForHelp(): CommandSpec[] {
  return COMMANDS;
}

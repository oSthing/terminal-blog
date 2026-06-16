/**
 * Tab completion for the in-browser terminal.
 *
 * Strategy:
 *   - first word          → command names
 *   - ls / cd / cat       → virtual filesystem paths
 *   - theme               → light | dark | system
 *   - blog <partial>      → post slugs
 *   - everything else     → no completion
 *
 * Returned candidates are strings that, when substituted for the current word
 * (i.e. `input.slice(0, wordStart) + candidate`), form a valid completion of
 * the user's input. Directories get a trailing `/` so the user can keep
 * tab-completing into them.
 */

import { commands, type CommandContext } from './commands';
import { terminalStore } from './store';
import type { VirtualFileSystem } from './filesystem';

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

/**
 * Split `input` into the leading command name, the current (last) word, and
 * the index where that word starts in the original `input`. Quoted strings
 * are NOT specially handled — the last whitespace-delimited token is used
 * verbatim. If `input` ends with whitespace, `word` is `''` (cursor sits in
 * a fresh slot).
 */
export function getCurrentWord(input: string): { command: string; word: string; wordStart: number } {
  const leadingWS = input.length - input.trimStart().length;

  if (input.trim().length === 0) {
    return { command: '', word: '', wordStart: input.length };
  }

  const tokenRegex = /\S+/g;
  const tokens: { start: number; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(input)) !== null) {
    tokens.push({ start: m.index, text: m[0] });
  }
  if (tokens.length === 0) {
    return { command: '', word: '', wordStart: input.length };
  }

  const command = tokens[0].text.toLowerCase();
  const endsWithWS = /\s$/.test(input);

  if (endsWithWS) {
    // Cursor sits after a space — next word is empty, starts at end of input.
    return { command, word: '', wordStart: input.length };
  }

  const last = tokens[tokens.length - 1];
  return { command, word: last.text, wordStart: last.start };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function commonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  if (strings.length === 1) return strings[0];
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    const s = strings[i];
    const max = Math.min(prefix.length, s.length);
    let j = 0;
    while (j < max && prefix[j] === s[j]) j++;
    prefix = prefix.slice(0, j);
    if (prefix === '') return '';
  }
  return prefix;
}

// ---------------------------------------------------------------------------
// Path completion (ls / cd / cat)
// ---------------------------------------------------------------------------

function completePath(fs: VirtualFileSystem, cwd: string, partial: string): string[] {
  const lastSlash = partial.lastIndexOf('/');
  const dirText = lastSlash === -1 ? '' : partial.slice(0, lastSlash);
  const namePrefix = lastSlash === -1 ? partial : partial.slice(lastSlash + 1);

  // Resolve the directory part against cwd. '' → cwd itself.
  const dirResolved = fs.resolve(cwd, dirText || '.');

  if (!fs.isDir(dirResolved)) return [];

  const children = fs.list(dirResolved) ?? [];
  const matched = children.filter((c) => c.name.startsWith(namePrefix));

  return matched.map((c) => {
    const trailing = c.type === 'dir' ? '/' : '';
    // Reconstruct: the directory prefix as the user typed it + the full child name.
    return dirText + (lastSlash >= 0 ? '/' : '') + c.name + trailing;
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export interface CompletionRequest {
  input: string;
  ctx: CommandContext;
}

export function getCandidates(req: CompletionRequest): string[] {
  const { input, ctx } = req;
  const { command, word } = getCurrentWord(input);

  // First word — complete command names.
  if (!command) {
    return Object.keys(commands)
      .filter((name) => name.startsWith(word))
      .sort();
  }

  // The user has typed a known command — branch on it.
  switch (command) {
    case 'ls':
    case 'cd':
    case 'cat':
      return completePath(ctx.fs, terminalStore.get().cwd, word);

    case 'theme':
      return ['light', 'dark', 'system'].filter((m) => m.startsWith(word));

    case 'blog': {
      const all = ctx.posts.map((p) => p.slug);
      return word === '' ? all : all.filter((s) => s.startsWith(word));
    }

    // Commands that take no args: nothing to complete beyond the command name.
    case 'help':
    case 'clear':
    case 'pwd':
    case 'whoami':
    case 'projects':
    case 'friends':
    case 'contact':
    case 'search':
    default:
      return [];
  }
}

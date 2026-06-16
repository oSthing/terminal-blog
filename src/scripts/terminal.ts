/**
 * Terminal — plain HTML implementation, modeled on LiveTerm.
 *
 * No xterm.js (the 5.3.0 build has known focus / input regressions on
 * recent Vite + Chrome). A real <input> receives keys, a scrollable
 * <div> holds the history, and a small ANSI-to-HTML converter keeps
 * the colour codes emitted by `commands.ts`.
 *
 * `mountTerminal(host, posts)` is idempotent for the same host.
 */

import { VirtualFileSystem, type FsDirectory } from './filesystem';
import { terminalStore } from './store';
import { run, type PostSummary } from './commands';
import { getCandidates, getCurrentWord, commonPrefix } from './completion';
import type { Friend } from '../data/friends';

// ---------------------------------------------------------------------------
// ANSI → HTML
// ---------------------------------------------------------------------------

const ANSI_8: Record<number, string> = {
  30: '#0a0a0b', 31: '#dc2626', 32: '#16a34a', 33: '#ca8a04',
  34: '#2563eb', 35: '#9333ea', 36: '#0891b2', 37: '#e5e7eb',
};
const ANSI_16: Record<number, string> = {
  90: '#525252', 91: '#ef4444', 92: '#22c55e', 93: '#eab308',
  94: '#3b82f6', 95: '#a855f7', 96: '#06b6d4', 97: '#fafafa',
};

function get256(n: number): string {
  if (n < 16) return ANSI_8[n] ?? '#e5e7eb';
  if (n < 232) {
    const i = n - 16;
    const r = Math.floor(i / 36);
    const g = Math.floor((i % 36) / 6);
    const b = i % 6;
    const cv = (v: number) => (v === 0 ? 0 : 55 + v * 40);
    return `rgb(${cv(r)},${cv(g)},${cv(b)})`;
  }
  const v = 8 + (n - 232) * 10;
  return `rgb(${v},${v},${v})`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ansiToHtml(text: string): string {
  const safe = escapeHtml(text);
  const ansiRegex = /\x1b\[([0-9;]+)m/g;
  let html = '';
  let lastIndex = 0;
  const openSpans: string[] = [];

  const closeAll = () => {
    while (openSpans.length > 0) {
      html += '</span>';
      openSpans.pop();
    }
  };

  let match: RegExpExecArray | null;
  while ((match = ansiRegex.exec(safe)) !== null) {
    html += safe.slice(lastIndex, match.index);
    const codes = match[1].split(';').map(Number);
    let i = 0;
    while (i < codes.length) {
      const c = codes[i];
      if (c === 0) {
        closeAll();
      } else if (c === 1) {
        html += '<span style="font-weight:bold">';
        openSpans.push('b');
      } else if (c === 4) {
        html += '<span style="text-decoration:underline">';
        openSpans.push('u');
      } else if (c === 38 && codes[i + 1] === 5 && i + 2 < codes.length) {
        closeAll();
        html += `<span style="color:${get256(codes[i + 2])}">`;
        openSpans.push('c');
        i += 2;
      } else if (c >= 30 && c <= 37) {
        closeAll();
        html += `<span style="color:${ANSI_8[c]}">`;
        openSpans.push('c');
      } else if (c >= 90 && c <= 97) {
        closeAll();
        html += `<span style="color:${ANSI_16[c]}">`;
        openSpans.push('c');
      }
      i++;
    }
    lastIndex = match.index + match[0].length;
  }
  html += safe.slice(lastIndex);
  closeAll();
  return html;
}

// ---------------------------------------------------------------------------
// Prompt + virtual filesystem
// ---------------------------------------------------------------------------

const renderPrompt = (cwd: string): string =>
  `<span class="t-user">oSthing@oSthing</span><span class="t-sep">:</span>` +
  `<span class="t-path">${escapeHtml(cwd)}</span> ` +
  `<span class="t-arrow">&gt;</span> `;

function makeFs(posts: PostSummary[]): VirtualFileSystem {
  const tree: FsDirectory = {
    type: 'dir',
    name: '/',
    children: [
      {
        type: 'file',
        name: 'about.txt',
        content: [
          "hi, i'm oSthing — a nobody mostly learning cybersecurity.",
          'this site collects my notes, experiments, the pitfalls from learning, and',
          'the small tools or automations i have built along the way.',
          'i started it because i wanted to write the kind of posts i should have',
          'written years ago.',
          '',
          "i have always thought of myself as pretty untalented. in games or in",
          'security, i keep meeting people who pick things up fast — they grasp new',
          'topics quickly, see the heart of a problem, and ship something decent on',
          'their first try. i mostly get by on time and repetition instead. what',
          'others absorb in one pass, i have to look up, try, fail, and slowly piece',
          'together.',
          '',
          'later on i realized that long-term passion and steady learning matter more',
          'than raw talent. i have met brilliant people, and i have watched some',
          'once-unreachable names quietly fade. so this is not a success story —',
          'just the trail of an ordinary person learning, failing, and trying again.',
          '',
          'if i look back someday, i hope i can say:',
          '  i was not fast, but i never stopped.',
          '',
          'elsewhere:',
          '  github:  https://github.com/oSthing',
          '  email:   osthinggg@gmail.com',
          '  qq:      2865934604',
          '  rss:     /rss.xml',
          '  note:    ping me about anything — including games :P',
          '',
          '-- /about',
        ].join('\n'),
      },
      { type: 'file', name: 'contact.txt', content: 'email:   osthinggg@gmail.com\nqq:      2865934604\ngithub:  https://github.com/oSthing\nrss:     /rss.xml' },
      {
        type: 'dir',
        name: 'blog',
        children: posts.map((p) => ({
          type: 'file',
          name: `${p.slug}.md`,
          content: `# ${p.title}\n\n${p.description}\n\n${p.body}\n\n-- /blog/${p.slug}`,
        })),
      },
      {
        type: 'dir',
        name: 'projects',
        children: [
          { type: 'file', name: 'terminal-blog.md', content: '# terminal-blog\n\nthis site. astro + plain html.' },
          { type: 'file', name: 'cryptopals.md', content: '# cryptopals\n\nmatasano challenges in rust.' },
        ],
      },
    ],
  };
  return new VirtualFileSystem(tree);
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

const mounted = new WeakSet<HTMLElement>();

export function mountTerminal(host: HTMLElement, posts: PostSummary[], friends: Friend[]): void {
  if (mounted.has(host)) return;
  mounted.add(host);

  const output = host.querySelector<HTMLDivElement>('#terminal-output');
  const form = host.querySelector<HTMLFormElement>('#terminal-form');
  const input = host.querySelector<HTMLInputElement>('#terminal-input');
  const promptEl = host.querySelector<HTMLSpanElement>('#terminal-prompt');

  if (!output || !form || !input || !promptEl) {
    console.error('[terminal] missing DOM nodes', { output, form, input, promptEl });
    return;
  }

  const fs = makeFs(posts);
  const ctx = { fs, posts, friends };

  const writeHtml = (html: string): void => {
    const div = document.createElement('div');
    div.className = 't-line';
    div.innerHTML = html;
    output!.appendChild(div);
  };
  const writeRaw = (text: string): void => writeHtml(ansiToHtml(text));
  const writePrompt = (): void => {
    promptEl!.innerHTML = renderPrompt(terminalStore.get().cwd);
  };
  const scrollToBottom = (): void => {
    host.scrollTop = host.scrollHeight;
  };

  // Boot
  writeRaw("\x1b[1moSthing's blog v1.0\x1b[0m");
  writeRaw("\x1b[38;5;245mCiallo～(∠・ω< )⌒☆  type \x1b[1;36mhelp\x1b[0m\x1b[38;5;245m to list commands. press \x1b[1;36m>\x1b[0m\x1b[38;5;245m and start typing.\x1b[0m");
  writePrompt();

  let historyIndex: number | null = null;
  let draft = '';

  const submit = async (): Promise<void> => {
    const line = input!.value;
    input!.value = '';
    draft = '';
    historyIndex = null;

    // Echo the command with the prompt
    writeHtml(renderPrompt(terminalStore.get().cwd) + escapeHtml(line));

    const trimmed = line.trim();
    if (trimmed.length > 0) {
      const state = terminalStore.get();
      const last = state.history[state.history.length - 1];
      if (last !== trimmed) {
        terminalStore.set((s) => ({ ...s, history: [...s.history, trimmed] }));
      }
    }

    if (trimmed === 'clear') {
      output!.innerHTML = '';
      writePrompt();
      scrollToBottom();
      return;
    }

    try {
      const result = await run(line, ctx);
      if (result) {
        for (const ln of result.split('\n')) writeRaw(ln);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      writeRaw(`\x1b[31merror:\x1b[0m ${msg}`);
    }

    writePrompt();
    scrollToBottom();
    input!.focus();
  };

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    void submit();
  });

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      const hist = terminalStore.get().history;
      if (hist.length === 0) return;
      if (historyIndex === null) {
        draft = input.value;
        historyIndex = hist.length - 1;
      } else if (historyIndex > 0) {
        historyIndex--;
      }
      input.value = hist[historyIndex] ?? '';
      moveCaretToEnd(input);
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      const hist = terminalStore.get().history;
      if (historyIndex === null) return;
      if (historyIndex >= hist.length - 1) {
        historyIndex = null;
        input.value = draft;
      } else {
        historyIndex++;
        input.value = hist[historyIndex] ?? '';
      }
      moveCaretToEnd(input);
    } else if (ev.key === 'Tab') {
      ev.preventDefault();
      const candidates = getCandidates({ input: input!.value, ctx });
      if (candidates.length === 0) return;

      const { word, wordStart } = getCurrentWord(input!.value);

      if (candidates.length === 1) {
        input!.value = input!.value.slice(0, wordStart) + candidates[0];
        moveCaretToEnd(input!);
        return;
      }

      const prefix = commonPrefix(candidates);
      if (prefix.length > word.length) {
        input!.value = input!.value.slice(0, wordStart) + prefix;
        moveCaretToEnd(input!);
      } else {
        // Already at the common prefix — list the candidates.
        // Match the muted `color()` style from commands.ts (SGR 38;5;245).
        writeRaw(`\x1b[38;5;245m${candidates.join('  ')}\x1b[0m`);
        scrollToBottom();
      }
    } else if (ev.ctrlKey && (ev.key === 'l' || ev.key === 'L')) {
      ev.preventDefault();
      output!.innerHTML = '';
      writePrompt();
    } else if (ev.ctrlKey && (ev.key === 'c' || ev.key === 'C')) {
      if (input.selectionStart !== input.selectionEnd) return; // allow copy
      ev.preventDefault();
      writeHtml(renderPrompt(terminalStore.get().cwd) + '^C');
      input.value = '';
      historyIndex = null;
      writePrompt();
    }
  });

  // Re-focus the input on any pointer interaction with the card.
  const focusInput = (): void => input.focus();
  host.addEventListener('mousedown', focusInput);
  host.addEventListener('touchstart', focusInput, { passive: true });

  // Steal focus back if the user types anywhere else on the page.
  window.addEventListener(
    'keydown',
    (ev) => {
      if (document.activeElement === input) return;
      if (ev.target instanceof HTMLElement && host.contains(ev.target)) return;
      // Don't hijack other form controls.
      const t = ev.target;
      if (
        (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) &&
        !host.contains(t)
      ) {
        return;
      }
      if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        input.focus();
      }
    },
    true,
  );

  // Initial focus.
  requestAnimationFrame(() => input.focus());
}

function moveCaretToEnd(input: HTMLInputElement): void {
  requestAnimationFrame(() => {
    input.selectionStart = input.selectionEnd = input.value.length;
  });
}

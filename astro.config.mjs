// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';

// GitHub Pages base URL — set to '/<repo>' for project pages, leave '/' for user/org pages.
const SITE = 'https://example.com';

// Restrict Shiki to a small set of languages we actually use on the blog
// to avoid pulling the full grammar collection on install / build.
const SHIKI_LANGS = ['bash', 'css', 'html', 'javascript', 'json', 'markdown', 'python', 'rust', 'shell', 'ts', 'tsx', 'typescript', 'yaml'];

export default defineConfig({
  site: SITE,
  base: '/',
  trailingSlash: 'never',
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
      langs: SHIKI_LANGS,
      wrap: true,
    },
    remarkPlugins: [remarkGfm],
  },
  vite: {
    ssr: {
      noExternal: ['xterm', 'xterm-addon-fit', 'xterm-addon-web-links'],
    },
  },
});

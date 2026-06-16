/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'IBM Plex Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        bg: {
          light: '#ffffff',
          dark: '#0a0a0b',
        },
        fg: {
          light: '#0a0a0b',
          dark: '#e7e7e8',
        },
        muted: {
          light: '#6b7280',
          dark: '#8b8b8e',
        },
        border: {
          light: '#e5e7eb',
          dark: '#27272a',
        },
        accent: {
          light: '#0a0a0b',
          dark: '#e7e7e8',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            'code::before': { content: '""' },
            'code::after': { content: '""' },
          },
        },
      },
    },
  },
  plugins: [typography],
};

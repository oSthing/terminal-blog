// Global site constants — change here once, applied everywhere.
export const SITE = {
  title: "oSthing's blog",
  tagline: 'Ciallo～(∠・ω< )⌒☆',
  description:
    "Ciallo～(∠・ω< )⌒☆ — oSthing's blog. A terminal-driven personal site for notes on systems, design, and the things in between.",
  author: 'oSthing',
  email: 'osthinggg@gmail.com',
  qq: '2865934604',
  github: 'https://github.com/oSthing',
  twitter: 'https://twitter.com/oSthing',
  url: 'https://osthing.github.io',
  locale: 'zh-CN',
  language: 'zh',
} as const;

export const NAV = [
  { href: '/', label: 'home' },
  { href: '/blog', label: 'blog' },
  { href: '/projects', label: 'projects' },
  { href: '/links', label: 'links' },
  { href: '/about', label: 'about' },
  { href: '/contact', label: 'contact' },
] as const;

export const SOCIAL = [
  { href: SITE.github, label: 'GitHub' },
  { href: '/rss.xml', label: 'RSS' },
] as const;

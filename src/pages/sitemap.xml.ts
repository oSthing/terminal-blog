import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../consts';

export async function GET(context: APIContext) {
  const base = (context.site ?? new URL(SITE.url)).toString().replace(/\/$/, '');
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  const staticUrls = ['', '/blog', '/projects', '/links', '/about', '/contact'].map((p) => ({
    loc: `${base}${p}`,
    lastmod: new Date().toISOString(),
    changefreq: 'weekly' as const,
    priority: p === '' ? 1.0 : 0.7,
  }));

  const postUrls = posts.map((entry) => ({
    loc: `${base}/blog/${entry.slug}`,
    lastmod: (entry.data.updatedDate ?? entry.data.pubDate).toISOString(),
    changefreq: 'monthly' as const,
    priority: 0.6,
  }));

  const urls = [...staticUrls, ...postUrls];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n` +
          `    <loc>${u.loc}</loc>\n` +
          `    <lastmod>${u.lastmod}</lastmod>\n` +
          `    <changefreq>${u.changefreq}</changefreq>\n` +
          `    <priority>${u.priority.toFixed(1)}</priority>\n` +
          `  </url>`,
      )
      .join('\n') +
    `\n</urlset>\n`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

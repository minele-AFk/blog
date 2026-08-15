import { getPosts } from '@/lib/posts';
import { getSiteUrl } from '@/lib/site';

export const revalidate = 3600;

export async function GET() {
  const siteUrl = getSiteUrl();
  const posts = await getPosts();

  const items = posts
    .map((post) => {
      const url = `${siteUrl}/blog/${post.slug}`;
      const pubDate = post.date ? new Date(post.date) : new Date();
      return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate.toUTCString()}</pubDate>
      <description><![CDATA[${post.excerpt || ''}]]></description>
      <category><![CDATA[${post.category}]]></category>
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[戏子多秋 の 小站]]></title>
    <link>${siteUrl}</link>
    <description><![CDATA[在代码、学术与分子动力学模拟间穿梭的普通人]]></description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}

import type { MetadataRoute } from 'next';
import { getPosts } from '@/lib/posts';
import { getSiteUrl } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const posts = await getPosts();

  const staticRoutes: MetadataRoute.Sitemap = ['', '/about', '/projects', '/archive', '/moments', '/friends', '/blog', '/music', '/anime'].map(
    (path) => ({
      url: `${siteUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: path === '' ? 1 : 0.8,
    })
  );

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes];
}

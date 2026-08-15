import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { BlogPost, Category, Tag } from './types';
// 构建时由 scripts/generate-posts-data.mjs 生成，供无持久磁盘环境（Cloudflare Workers）回退
import { generatedPosts } from './generated/posts-data';

const postsDirectory = path.join(process.cwd(), 'posts');

export async function getPosts(): Promise<BlogPost[]> {
  try {
    const filenames = fs.readdirSync(postsDirectory);

    const posts = filenames
      .filter(filename => filename.endsWith('.md'))
      .map(filename => {
        const fullPath = path.join(postsDirectory, filename);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data, content } = matter(fileContents);

        const slug = filename.replace(/\.md$/, '');
        const readTime = Math.ceil(content.split('').length / 500);

        return {
          id: slug,
          title: data.title as string,
          slug,
          excerpt: (data.excerpt as string) || '',
          content,
          date: data.date as string,
          tags: (data.tags as string[]) || [],
          category: data.category as string || '其他',
          author: data.author as string || '管理员',
          coverImage: data.coverImage as string,
          readTime,
        } as BlogPost;
      });

    return posts.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
  } catch {
    // Workers 无持久磁盘：posts/ 不存在时回退到构建时生成的静态数据
    return generatedPosts;
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const posts = await getPosts();
  return posts.find(post => post.slug === slug);
}

export async function getCategories(): Promise<Category[]> {
  const posts = await getPosts();
  const categoryMap = new Map<string, number>();
  
  posts.forEach(post => {
    const count = categoryMap.get(post.category) || 0;
    categoryMap.set(post.category, count + 1);
  });
  
  return Array.from(categoryMap.entries()).map(([name, count]) => ({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    count,
  }));
}

export async function getTags(): Promise<Tag[]> {
  const posts = await getPosts();
  const tagMap = new Map<string, number>();
  
  posts.forEach(post => {
    post.tags.forEach(tag => {
      const count = tagMap.get(tag) || 0;
      tagMap.set(tag, count + 1);
    });
  });
  
  return Array.from(tagMap.entries()).map(([name, count]) => ({ name, count }));
}

export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
  const posts = await getPosts();
  return posts.filter(post => 
    post.category.toLowerCase().replace(/\s+/g, '-') === category.toLowerCase()
  );
}

export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  const posts = await getPosts();
  return posts.filter(post => post.tags.includes(tag));
}

export async function getPostSlugs(): Promise<string[]> {
  const posts = await getPosts();
  return posts.map(post => post.slug);
}

export async function searchPosts(query: string): Promise<BlogPost[]> {
  const posts = await getPosts();
  
  if (!query.trim()) {
    return posts;
  }
  
  const lowerQuery = query.toLowerCase();
  
  return posts.filter(post => {
    // 空值保护：frontmatter 缺失字段时不影响搜索，避免抛 TypeError
    const title = post.title || '';
    const excerpt = post.excerpt || '';
    const content = post.content || '';
    const category = post.category || '';
    const tags = Array.isArray(post.tags) ? post.tags : [];
    return (
      title.toLowerCase().includes(lowerQuery) ||
      excerpt.toLowerCase().includes(lowerQuery) ||
      content.toLowerCase().includes(lowerQuery) ||
      category.toLowerCase().includes(lowerQuery) ||
      tags.some(tag => (tag || '').toLowerCase().includes(lowerQuery))
    );
  });
}

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { BlogPost, Category, Tag } from './types';
import { isCloudflare, kvGetJson, kvSetRaw, kvGetRaw, kvDelete } from './storage';
// 构建时由 scripts/generate-posts-data.mjs 生成，供无持久磁盘环境（Cloudflare Workers）回退
import { generatedPosts } from './generated/posts-data';

const postsDirectory = path.join(process.cwd(), 'posts');

// ---------------- Workers KV 文章存储 ----------------
// key 约定：
//   post:index  -> slug 列表（JSON 数组），标识 KV 中是否存在后台发布的文章
//   post:{slug} -> 文章 markdown 全文（含 frontmatter，与 posts/*.md 格式一致）
const POST_INDEX_KEY = 'post:index';
const postKey = (slug: string) => `post:${slug}`;

// 解析 markdown 字符串为 BlogPost（前后端共用，字段空值兜底）
const parseMarkdownPost = (slug: string, raw: string): BlogPost => {
  const { data, content } = matter(raw);
  const readTime = Math.ceil(content.split('').length / 500);
  return {
    id: slug,
    title: (data.title as string) || slug,
    slug,
    excerpt: (data.excerpt as string) || '',
    content,
    date: (data.date as string) || '',
    tags: (data.tags as string[]) || [],
    category: (data.category as string) || '其他',
    author: (data.author as string) || '管理员',
    coverImage: data.coverImage as string | undefined,
    readTime,
  };
};

// 读取 KV 中的全部后台文章（无后台文章时返回 null）
async function getPostsFromKv(): Promise<BlogPost[] | null> {
  const index = await kvGetJson<string[]>(POST_INDEX_KEY);
  if (!index || index.length === 0) return null;

  const posts: BlogPost[] = [];
  for (const slug of index) {
    if (!slug || !/^[\w-]+$/.test(slug)) continue;
    const raw = await kvGetRaw(postKey(slug));
    if (!raw) continue;
    try {
      posts.push(parseMarkdownPost(slug, raw));
    } catch {
      // 单篇解析失败跳过，不影响其余文章
    }
  }
  return posts;
}

// 向 KV 写入/更新一篇文章并维护 index（供管理端调用；本地模式无操作）
export async function savePostToKv(slug: string, rawMarkdown: string): Promise<void> {
  if (!isCloudflare()) return;
  await kvSetRaw(postKey(slug), rawMarkdown);
  const index = (await kvGetJson<string[]>(POST_INDEX_KEY)) ?? [];
  if (!index.includes(slug)) {
    index.push(slug);
    await kvSetRaw(POST_INDEX_KEY, JSON.stringify(index));
  }
}

// 从 KV 删除一篇文章并维护 index（供管理端调用；本地模式无操作）
export async function deletePostFromKv(slug: string): Promise<void> {
  if (!isCloudflare()) return;
  await kvDelete(postKey(slug));
  const index = (await kvGetJson<string[]>(POST_INDEX_KEY)) ?? [];
  const next = index.filter((s) => s !== slug);
  if (next.length > 0) {
    await kvSetRaw(POST_INDEX_KEY, JSON.stringify(next));
  } else {
    await kvDelete(POST_INDEX_KEY);
  }
}

// 检查 KV 中是否存在某篇文章（Workers 模式；本地模式始终 false）
export async function postExistsInKv(slug: string): Promise<boolean> {
  if (!isCloudflare()) return false;
  const raw = await kvGetRaw(postKey(slug));
  return raw !== null;
}

// ---------------- 文章读取 ----------------

export async function getPosts(): Promise<BlogPost[]> {
  // Workers：KV 中的后台文章与构建快照合并（KV 优先，覆盖同名构建快照）
  if (isCloudflare()) {
    const kvPosts = await getPostsFromKv();
    if (!kvPosts) return generatedPosts;
    const base = generatedPosts.filter((p) => !kvPosts.some((k) => k.slug === p.slug));
    const merged = [...base, ...kvPosts];
    return merged.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
  }

  // 本地：读取 posts/*.md
  try {
    const filenames = fs.readdirSync(postsDirectory);

    const posts = filenames
      .filter(filename => filename.endsWith('.md'))
      .map(filename => {
        const fullPath = path.join(postsDirectory, filename);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const slug = filename.replace(/\.md$/, '');
        return parseMarkdownPost(slug, fileContents);
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

// 构建时把 posts/*.md 解析成静态数据模块（lib/generated/posts-data.ts），
// 供 Cloudflare Workers（无持久磁盘）运行时回退使用。
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const postsDir = path.join(process.cwd(), 'posts');
const outDir = path.join(process.cwd(), 'lib', 'generated');
const outFile = path.join(outDir, 'posts-data.ts');

const writeOutput = (posts) => {
  fs.mkdirSync(outDir, { recursive: true });
  const ts = `import type { BlogPost } from "../types";\n\nexport const generatedPosts: BlogPost[] = ${JSON.stringify(posts, null, 2)};\n`;
  fs.writeFileSync(outFile, ts);
  console.log(`[generate-posts-data] wrote ${posts.length} posts -> ${outFile}`);
};

if (!fs.existsSync(postsDir)) {
  console.warn('[generate-posts-data] posts/ not found, generating empty data');
  writeOutput([]);
  process.exit(0);
}

const filenames = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'));

const posts = filenames
  .map((filename) => {
    const fullPath = path.join(postsDir, filename);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    const slug = filename.replace(/\.md$/, '');
    const readTime = Math.ceil(content.split('').length / 500);
    return {
      id: slug,
      title: data.title,
      slug,
      excerpt: data.excerpt || '',
      content,
      date: data.date,
      tags: data.tags || [],
      category: data.category || '其他',
      author: data.author || '管理员',
      ...(data.coverImage ? { coverImage: data.coverImage } : {}),
      readTime,
    };
  })
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

writeOutput(posts);

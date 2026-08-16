import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/auth';
import { getPosts, savePostToKv, postExistsInKv } from '../../../../lib/posts';
import { isValidSlug } from '../../../../lib/slug';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { isCloudflare } from '../../../../lib/storage';

export async function GET() {
  const posts = await getPosts();
  return NextResponse.json({ success: true, data: posts });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }
  const { title, slug, excerpt, content, date, tags, category, author, coverImage } = body as {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    date?: string;
    tags?: string[];
    category?: string;
    author?: string;
    coverImage?: string;
  };

  if (!title || !content) {
    return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
  }

  const postSlug = slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  if (!isValidSlug(postSlug)) {
    const error = slug
      ? 'slug 格式不合法（仅允许字母、数字、下划线、连字符）'
      : '标题无法自动生成英文 slug，请在 slug 字段填写英文路径（仅允许字母、数字、下划线、连字符）';
    return NextResponse.json({ error }, { status: 400 });
  }
  const postsDirectory = path.join(process.cwd(), 'posts');
  const targetPath = path.join(postsDirectory, `${postSlug}.md`);

  // 防止静默覆盖已有文章（重名 slug 返回冲突，前端提示走编辑）
  const existsInFs = !isCloudflare() && fs.existsSync(targetPath);
  if (existsInFs || (await postExistsInKv(postSlug))) {
    return NextResponse.json(
      { error: `slug「${postSlug}」已存在，请修改 slug 或直接编辑该文章` },
      { status: 409 }
    );
  }

  const frontmatter = {
    title,
    excerpt: excerpt || '',
    date: date || new Date().toISOString().split('T')[0],
    tags: tags || [],
    category: category || '其他',
    author: author || '管理员',
    coverImage: coverImage || '',
  };

  const fileContent = matter.stringify(content, frontmatter);

  // Workers 无磁盘：写入 KV；本地：写入 posts/*.md
  if (isCloudflare()) {
    await savePostToKv(postSlug, fileContent);
  } else {
    if (!fs.existsSync(postsDirectory)) {
      fs.mkdirSync(postsDirectory, { recursive: true });
    }
    fs.writeFileSync(targetPath, fileContent);
  }

  return NextResponse.json({ success: true, data: { slug: postSlug, ...frontmatter } }, { status: 201 });
}

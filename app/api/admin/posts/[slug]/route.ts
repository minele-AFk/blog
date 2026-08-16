import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '../../../../../lib/auth';
import { isValidSlug } from '../../../../../lib/slug';
import { savePostToKv, deletePostFromKv, postExistsInKv } from '../../../../../lib/posts';
import { isCloudflare } from '../../../../../lib/storage';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: 'slug 格式不合法' }, { status: 400 });
  }
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const body = await request.json();
  const { title, excerpt, content, date, tags, category, author, coverImage } = body;

  const postsDirectory = path.join(process.cwd(), 'posts');
  const resolvedPath = path.resolve(postsDirectory, `${slug}.md`);
  if (!resolvedPath.startsWith(path.resolve(postsDirectory) + path.sep)) {
    return NextResponse.json({ error: '非法路径' }, { status: 400 });
  }
  const filePath = resolvedPath;

  // 文章存在性检查（Workers 查 KV，本地查 fs）
  const existsInFs = !isCloudflare() && fs.existsSync(filePath);
  if (!existsInFs && !(await postExistsInKv(slug))) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  const frontmatter = {
    title: title || '',
    excerpt: excerpt || '',
    date: date || '',
    tags: tags || [],
    category: category || '其他',
    author: author || '管理员',
    coverImage: coverImage || '',
  };

  const fileContent = matter.stringify(content || '', frontmatter);

  // Workers 无磁盘：写入 KV；本地：写入 posts/*.md
  if (isCloudflare()) {
    await savePostToKv(slug, fileContent);
  } else {
    fs.writeFileSync(filePath, fileContent);
  }

  return NextResponse.json({ success: true, data: { slug, ...frontmatter } });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: 'slug 格式不合法' }, { status: 400 });
  }
  const authHeader = _request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const postsDirectory = path.join(process.cwd(), 'posts');
  const resolvedPath = path.resolve(postsDirectory, `${slug}.md`);
  if (!resolvedPath.startsWith(path.resolve(postsDirectory) + path.sep)) {
    return NextResponse.json({ error: '非法路径' }, { status: 400 });
  }
  const filePath = resolvedPath;

  // 存在性检查（Workers 查 KV，本地查 fs）
  const existsInFs = !isCloudflare() && fs.existsSync(filePath);
  if (!existsInFs && !(await postExistsInKv(slug))) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  // Workers 无磁盘：删除 KV；本地：删除 posts/*.md
  if (isCloudflare()) {
    await deletePostFromKv(slug);
  } else {
    fs.unlinkSync(filePath);
  }
  return NextResponse.json({ success: true });
}

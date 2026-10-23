import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth';
import { readJsonObject, validateFields, text, withApiErrors } from '@/lib/request-security';
import { getPosts, savePostToKv, postExistsInKv } from '../../../../lib/posts';
import { isValidSlug } from '../../../../lib/slug';
import fs from 'fs';
import path from 'path';
import { stringifyFrontmatter } from '@/lib/frontmatter.mjs';
import { isCloudflare } from '../../../../lib/storage';

export async function GET() {
  const posts = await getPosts();
  return NextResponse.json({ success: true, data: posts });
}

export const POST = withApiErrors(async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const { slug: rawSlug, ...input } = await readJsonObject(request);
  const { content, ...frontmatter } = validateFields('posts', input);
  const slug = text(rawSlug, 100);
  const postSlug = slug || frontmatter.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  if (!isValidSlug(postSlug)) {
    return NextResponse.json({ error: '请填写合法英文 slug（字母、数字、下划线、连字符）' }, { status: 400 });
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

  const fileContent = stringifyFrontmatter(content, frontmatter);

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
});

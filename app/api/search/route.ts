import { NextRequest, NextResponse } from 'next/server';
import { searchPosts } from '../../../lib/posts';

// 搜索实时读取文章文件，强制动态渲染，确保发布后立即可搜到
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  
  const results = await searchPosts(query);

  // 搜索结果只需元数据，不返回全文内容（减小响应体积）
  const data = results.map(({ content: _content, ...meta }) => meta);

  return NextResponse.json({
    success: true,
    data,
    count: data.length,
  });
}
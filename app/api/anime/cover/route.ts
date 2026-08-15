import { NextResponse } from 'next/server';

// 图片代理API：bgm.tv 图片在国内访问受限，使用 wsrv.nl 作为图片代理
// wsrv.nl 是稳定的图片代理+缓存服务，支持图片格式转换和尺寸调整
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url || !url.startsWith('https://lain.bgm.tv/')) {
    return new NextResponse('Bad request', { status: 400 });
  }

  // 使用 wsrv.nl 代理，附加优化参数：
  // - output=jpg: 统一输出 JPG 格式
  // - w=300&h=400: 限制尺寸以加快加载（保持 3:4 比例）
  // - q=80: 适当压缩质量
  const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&w=300&h=400&q=80`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(proxyUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return new NextResponse(`Image fetch failed: ${res.status}`, { status: res.status });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new NextResponse(`Proxy error: ${msg}`, { status: 502 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { r2Get } from '../../../lib/storage';

// 上传图片读取路由：
// - Workers（无磁盘）：从 R2 读取（本地 public/uploads 不在构建资产中，静态资源 404 后走到这里）
// - 本地：public/uploads 由 Next.js 静态服务，仅在该文件不存在时兜底走 fs（保持行为一致）
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

// 校验路径片段：仅允许单层合法文件名，防路径穿越
const isValidPath = (segments: string[]): string | null => {
  if (segments.length !== 1) return null;
  const name = segments[0];
  if (!name || name !== path.basename(name)) return null;
  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return null;
  return name;
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const filename = isValidPath(segments);
  if (!filename) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const contentType = MIME_MAP[path.extname(filename).toLowerCase()] || 'application/octet-stream';

  // 1. Workers：从 R2 读取
  const r2Object = await r2Get(filename);
  if (r2Object?.body) {
    return new NextResponse(r2Object.body as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': r2Object.httpMetadata?.contentType || contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // 2. 本地兜底：读 public/uploads
  const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
  try {
    const s = await stat(filePath);
    if (!s.isFile()) throw new Error('not a file');
    const stream = createReadStream(filePath);
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(s.size),
      },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}

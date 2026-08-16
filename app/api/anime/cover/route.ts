import { NextResponse } from 'next/server';
import { isCloudflare, kvGetRaw, kvSetRaw } from '@/lib/storage';

// 图片代理API：bgm.tv 图片在国内访问受限，使用 wsrv.nl 作为图片代理
// wsrv.nl 是稳定的图片代理+缓存服务，支持图片格式转换和尺寸调整
//
// 性能优化：增加服务端持久化缓存（本地 fs / Workers KV 双模式）。
// 每张封面只向 wsrv.nl 拉取一次，之后所有请求从缓存秒回，
// 避免每次访问追番页都实时请求国外图床导致"好几秒才加载出来"。

const CACHE_PREFIX = 'cover:';

const IMG_HEADERS = {
  'Content-Type': 'image/jpeg',
  'Cache-Control': 'public, max-age=86400, immutable',
};

// 简单字符串 hash（djb2），由原图 URL 生成稳定缓存 key
function hashUrl(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) + h + url.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

// 本地缓存目录（仅本地 dev 使用）
async function getLocalCacheDir(): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const dir = path.join(process.cwd(), 'data', 'cover-cache');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function base64ToUint8(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

async function readCoverCache(key: string): Promise<Uint8Array<ArrayBuffer> | null> {
  if (isCloudflare()) {
    const raw = await kvGetRaw(CACHE_PREFIX + key);
    return raw ? base64ToUint8(raw) : null;
  }
  const fs = await import('fs/promises');
  const path = await import('path');
  const dir = await getLocalCacheDir();
  try {
    // new Uint8Array(buf) 转成标准类型，避免 Buffer(ArrayBufferLike) 与 BodyInit 类型不兼容
    return new Uint8Array(await fs.readFile(path.join(dir, key + '.jpg')));
  } catch {
    return null;
  }
}

async function writeCoverCache(key: string, bytes: Uint8Array): Promise<void> {
  if (isCloudflare()) {
    await kvSetRaw(CACHE_PREFIX + key, uint8ToBase64(bytes));
    return;
  }
  const fs = await import('fs/promises');
  const path = await import('path');
  const dir = await getLocalCacheDir();
  await fs.writeFile(path.join(dir, key + '.jpg'), bytes);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url || !url.startsWith('https://lain.bgm.tv/')) {
    return new NextResponse('Bad request', { status: 400 });
  }

  const key = hashUrl(url);

  // 1. 缓存命中直接返回（本地 fs / Workers KV）
  try {
    const cached = await readCoverCache(key);
    if (cached && cached.byteLength > 0) {
      return new NextResponse(cached, { headers: IMG_HEADERS });
    }
  } catch {
    // 缓存读取失败不阻塞，继续走代理
  }

  // 2. 未命中 → 使用 wsrv.nl 代理，附加优化参数：
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

    const bytes = new Uint8Array(await res.arrayBuffer());
    // 3. 异步写入缓存，不阻塞本次响应
    void writeCoverCache(key, bytes).catch(() => {});
    return new NextResponse(bytes, { headers: IMG_HEADERS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new NextResponse(`Proxy error: ${msg}`, { status: 502 });
  }
}

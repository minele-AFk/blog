import { NextResponse } from 'next/server';
import { isCloudflare, kvGetRaw, kvSetRaw } from '@/lib/storage';

// GitHub 头像代理：解决国内访问 avatars.githubusercontent.com 不稳定的问题
// - 本地 dev：缓存到 data/avatar-cache/ 目录
// - Cloudflare Workers：缓存到 KV（键前缀 avatar:）
// - 通过 Worker 出口（Cloudflare 网络）抓取，国内网络也能快速拿到

const CACHE_PREFIX = 'avatar:';

const IMG_HEADERS = {
  'Content-Type': 'image/jpeg',
  'Cache-Control': 'public, max-age=604800, immutable', // 7 天客户端缓存
};

function hashUrl(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) + h + url.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

async function getLocalCacheDir(): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const dir = path.join(process.cwd(), 'data', 'avatar-cache');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function base64ToUint8(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i);
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

async function readCache(key: string): Promise<Uint8Array<ArrayBuffer> | null> {
  if (isCloudflare()) {
    const raw = await kvGetRaw(CACHE_PREFIX + key);
    return raw ? base64ToUint8(raw) : null;
  }
  const fs = await import('fs/promises');
  const path = await import('path');
  const dir = await getLocalCacheDir();
  try {
    return new Uint8Array(await fs.readFile(path.join(dir, key + '.bin')));
  } catch {
    return null;
  }
}

async function writeCache(key: string, bytes: Uint8Array): Promise<void> {
  if (isCloudflare()) {
    // 头像通常 < 20KB，但 KV 单值上限 25MB，base64 后约 1.33× 也很安全
    if (bytes.byteLength > 1024 * 1024) return; // 1MB 上限保护，避免异常大图撑爆 KV
    await kvSetRaw(CACHE_PREFIX + key, uint8ToBase64(bytes));
    return;
  }
  const fs = await import('fs/promises');
  const path = await import('path');
  const dir = await getLocalCacheDir();
  await fs.writeFile(path.join(dir, key + '.bin'), bytes);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('u');
  // 仅允许 GitHub 头像域名，避免被滥用做任意代理
  if (!url || !url.startsWith('https://avatars.githubusercontent.com/')) {
    return new NextResponse('Bad request', { status: 400 });
  }

  const key = hashUrl(url);

  // 1. 缓存命中
  try {
    const cached = await readCache(key);
    if (cached && cached.byteLength > 0) {
      return new NextResponse(cached, { headers: IMG_HEADERS });
    }
  } catch {
    // 缓存读取失败不阻塞
  }

  // 2. 未命中 → 通过 Worker 出口抓取
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return new NextResponse(`Avatar fetch failed: ${res.status}`, { status: res.status });
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    void writeCache(key, bytes).catch(() => {});
    return new NextResponse(bytes, { headers: IMG_HEADERS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new NextResponse(`Proxy error: ${msg}`, { status: 502 });
  }
}

import { createHash } from 'node:crypto';
import { isCloudflare, kvGetRaw, kvSetRaw } from './storage';
import { readLimitedBody } from './request-security';

type Kind = 'avatar' | 'cover';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 500;
const TTL = 7 * 24 * 60 * 60;
type CachedImage = { type: string; base64: string };

export function canonicalImageUrl(raw: string | null, kind: Kind): string | null {
  if (!raw || raw.length > 2048 || /[\u0000-\u0020\u007f\\]/.test(raw)) return null;
  try {
    const url = new URL(raw);
    const host = kind === 'avatar' ? 'avatars.githubusercontent.com' : 'lain.bgm.tv';
    if (url.protocol !== 'https:' || url.hostname !== host || url.port || url.username || url.password) return null;
    const validPath = kind === 'avatar'
      ? /^\/(?:[a-zA-Z0-9][a-zA-Z0-9-]{0,38}|u\/[1-9][0-9]{0,19})$/.test(url.pathname)
      : /^\/pic\/cover\/[a-z]\/[-a-zA-Z0-9_/.]+\.(?:jpe?g|png|gif|webp)$/.test(url.pathname);
    if (!validPath) return null;
    // Ignore user-supplied query/fragment so random cache busters cannot allocate keys.
    return `https://${host}${url.pathname}${kind === 'avatar' ? '?s=128' : ''}`;
  } catch { return null; }
}

function imageType(bytes: Uint8Array): string | null {
  const hex = Buffer.from(bytes.subarray(0, 12)).toString('hex');
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  if (hex.startsWith('89504e470d0a1a0a')) return 'image/png';
  if (hex.startsWith('474946383761') || hex.startsWith('474946383961')) return 'image/gif';
  if (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') return 'image/webp';
  return null;
}

async function readCache(key: string): Promise<CachedImage | null> {
  if (isCloudflare()) {
    const raw = await kvGetRaw(key);
    return raw ? JSON.parse(raw) : null;
  }
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const file = path.join(process.cwd(), 'data', 'image-cache', `${key.replace(':', '-')}.json`);
  if (Date.now() - (await fs.stat(file)).mtimeMs > TTL * 1000) return null;
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeCache(key: string, image: CachedImage): Promise<void> {
  const raw = JSON.stringify(image);
  if (isCloudflare()) { await kvSetRaw(key, raw, { expirationTtl: TTL }); return; }
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const dir = path.join(process.cwd(), 'data', 'image-cache');
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir);
  if (entries.length >= MAX_CACHE_ENTRIES) {
    const dated = await Promise.all(entries.map(async (name) => ({ name, time: (await fs.stat(path.join(dir, name))).mtimeMs })));
    dated.sort((a, b) => a.time - b.time);
    await Promise.all(dated.slice(0, entries.length - MAX_CACHE_ENTRIES + 1).map(({ name }) => fs.unlink(path.join(dir, name))));
  }
  await fs.writeFile(path.join(dir, `${key.replace(':', '-')}.json`), raw);
}

const imageResponse = (image: CachedImage) => new Response(new Uint8Array(Buffer.from(image.base64, 'base64')), {
  headers: { 'Content-Type': image.type, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' },
});

export async function serveImageProxy(request: Request, kind: Kind): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const url = canonicalImageUrl(params.get(kind === 'avatar' ? 'u' : 'url'), kind);
  if (!url) return new Response('Bad request', { status: 400 });
  const key = `${kind}:${createHash('sha256').update(url).digest('hex')}`;
  try {
    const image = await readCache(key);
    if (image) return imageResponse(image);
  } catch { /* Cache miss or invalid cache: fetch again. */ }
  const target = kind === 'cover' ? `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&w=300&h=400&q=80` : url;
  try {
    const res = await fetch(target, {
      headers: { 'User-Agent': 'personal-blog/1.0', Accept: 'image/jpeg,image/png,image/gif,image/webp' },
      redirect: 'manual', signal: AbortSignal.timeout(10000),
    });
    if (!res.ok || !/^image\/(jpeg|png|gif|webp)(;|$)/i.test(res.headers.get('content-type') ?? '')) {
      await res.body?.cancel();
      return new Response('Invalid upstream image', { status: 502 });
    }
    const bytes = await readLimitedBody(res, MAX_IMAGE_BYTES);
    const type = imageType(bytes);
    if (!type) return new Response('Invalid upstream image', { status: 502 });
    const image = { type, base64: Buffer.from(bytes).toString('base64') };
    // Await persistence so Workers cannot terminate the write after the response.
    await writeCache(key, image).catch(() => {});
    return imageResponse(image);
  } catch { return new Response('Image fetch failed', { status: 502 }); }
}

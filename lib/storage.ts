import { getCloudflareContext } from '@opennextjs/cloudflare';

// ---------------------------------------------------------------------------
// 存储适配层：本地（Next.js / Node fs）与 Cloudflare Workers（KV / R2）双模式
// ---------------------------------------------------------------------------
// 背景：博客已部署到 Cloudflare Workers（OpenNext），Workers 无持久磁盘，
// 原 fs 读写 data/*.json、posts/*.md、public/uploads 的逻辑全部失效。
// 本模块统一封装判断与 KV/R2 访问，业务代码无需关心运行环境。
//
// 判断逻辑：能在 request 上下文调用 getCloudflareContext 即视为 Workers 环境；
// 本地 next dev / build 时 getCloudflareContext 抛错，回退 fs 模式。
// ---------------------------------------------------------------------------

// 轻量类型声明（避免依赖 @cloudflare/workers-types）
interface KvLike {
  get(key: string): Promise<string | null>;
  // 关键：OpenNext 的 KV binding 把 raw bytes 当 latin1 解释后返回 string，
  // 导致 UTF-8 中文二次编码成 mojibake。改用 arrayBuffer + TextDecoder('utf-8') 解码
  // 可以完全绕开这个 bug，保持原始字节不变。
  get(key: string, options: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>;
  put(key: string, value: string): Promise<void>;
  put(key: string, value: ArrayBuffer | Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: {
    prefix?: string;
    cursor?: string;
  }): Promise<{ keys: Array<{ name: string }>; cursor: string | null; list_complete: boolean }>;
}

interface R2ObjectLike {
  key: string;
  size: number;
  uploads: Date;
  body: ReadableStream | null;
  httpMetadata?: { contentType?: string };
}

interface R2BucketLike {
  put(key: string, value: ArrayBuffer | Uint8Array | string, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<{
    objects: R2ObjectLike[];
    cursor?: string | null;
    truncated: boolean;
  }>;
}

// 是否运行在 Cloudflare Workers（惰性检测 + 结果缓存）
let isCfEnv: boolean | null = null;

export function isCloudflare(): boolean {
  if (isCfEnv !== null) return isCfEnv;
  try {
    getCloudflareContext({ async: false });
    isCfEnv = true;
  } catch {
    isCfEnv = false;
  }
  return isCfEnv;
}

// 获取 KV binding（非 Workers 环境或未配置时返回 null）
export function getKv(): KvLike | null {
  if (!isCloudflare()) return null;
  try {
    const env = getCloudflareContext({ async: false }).env as Record<string, unknown>;
    return (env.BLOG_DATA as KvLike | undefined) ?? null;
  } catch {
    return null;
  }
}

// 获取 R2 binding（非 Workers 环境或未配置时返回 null）
export function getR2(): R2BucketLike | null {
  if (!isCloudflare()) return null;
  try {
    const env = getCloudflareContext({ async: false }).env as Record<string, unknown>;
    return (env.BLOG_UPLOADS as R2BucketLike | undefined) ?? null;
  } catch {
    return null;
  }
}

// ---------------- KV 封装（JSON 值） ----------------

// 工具：base64 编码字符串为 ASCII 字节。Workers 部署时（OpenNext），
// KV binding 中转链路会把 UTF-8 字节破坏成 mojibake（疑似 latin1 解释后重新编码）。
// 用 base64 把任意 UTF-8 字符串转成纯 ASCII 字节，可以完全绕开编码层的破坏。
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8');

function toBase64(str: string): string {
  // btoa(unescape(encodeURIComponent(str))) 是浏览器/Workers 中将 UTF-8 安全转 base64 的标准做法
  const bytes = enc.encode(str);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

function fromBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return dec.decode(bytes);
}

// JSON 值在 KV 中的编码：b64(<json>)，前缀 `B64:` 标识。
// 旧版本未加前缀的明文 JSON 数据，读取时若解码失败回退到原值（兼容旧数据）。
const B64_PREFIX = 'B64:';

export async function kvGetJson<T>(key: string): Promise<T | null> {
  const kv = getKv();
  if (!kv) return null;
  try {
    // 默认 text 读取：避免 arrayBuffer 路径在某些 OpenNext 版本上也被破坏
    const raw = await kv.get(key);
    if (!raw) return null;
    if (raw.startsWith(B64_PREFIX)) {
      return JSON.parse(fromBase64(raw.slice(B64_PREFIX.length))) as T;
    }
    // 旧数据（非 b64 包装）回退：尝试直接 JSON.parse，
    // 如果旧数据恰好是非 UTF-8 编码被破坏的，这种回退仍会失败，但至少不影响新数据
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export async function kvSetJson(key: string, value: unknown): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  const json = JSON.stringify(value);
  // 写入时强制 base64 包装，确保任意 Unicode 字符都能安全往返
  await kv.put(key, B64_PREFIX + toBase64(json));
}

export async function kvSetRaw(key: string, value: string): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  // 原始字符串也走 base64，保证非 ASCII 字符串不会在 KV 中转时被破坏
  await kv.put(key, B64_PREFIX + toBase64(value));
}

export async function kvGetRaw(key: string): Promise<string | null> {
  const kv = getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    if (!raw) return null;
    if (raw.startsWith(B64_PREFIX)) return fromBase64(raw.slice(B64_PREFIX.length));
    return raw; // 旧数据原样返回
  } catch {
    return null;
  }
}

export async function kvDelete(key: string): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  await kv.delete(key);
}

export async function kvListKeys(prefix: string): Promise<string[]> {
  const kv = getKv();
  if (!kv) return [];
  const keys: string[] = [];
  let cursor: string | null | undefined;
  do {
    const page = await kv.list({ prefix, cursor: cursor ?? undefined });
    keys.push(...page.keys.map((k) => k.name));
    cursor = page.cursor;
  } while (cursor);
  return keys;
}

// ---------------- R2 封装 ----------------

export async function r2Put(key: string, value: ArrayBuffer | Uint8Array, contentType: string): Promise<boolean> {
  const bucket = getR2();
  if (!bucket) return false;
  try {
    await bucket.put(key, value, { httpMetadata: { contentType } });
    return true;
  } catch {
    return false;
  }
}

export async function r2Get(key: string): Promise<R2ObjectLike | null> {
  const bucket = getR2();
  if (!bucket) return null;
  try {
    return await bucket.get(key);
  } catch {
    return null;
  }
}

export async function r2Delete(key: string): Promise<boolean> {
  const bucket = getR2();
  if (!bucket) return false;
  try {
    await bucket.delete(key);
    return true;
  } catch {
    return false;
  }
}

export async function r2List(): Promise<R2ObjectLike[]> {
  const bucket = getR2();
  if (!bucket) return [];
  const objects: R2ObjectLike[] = [];
  let cursor: string | null | undefined;
  do {
    const page = await bucket.list({ cursor: cursor ?? undefined });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor ?? null : null;
  } while (cursor);
  return objects;
}

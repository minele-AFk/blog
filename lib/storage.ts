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

// 关键背景：OpenNext Cloudflare Adapter 提供的 KV binding 在调用 `get(key)` 时，
// 把 raw bytes 逐字节当作 latin1 字符解释后返回 JS string。
// 例：KV 中真实字节 `B64:Wwog...`，Worker 拿到 `é²¸è½è¾°ç©º...`（每个 byte < 0x80 都被翻译成不同字符）
// 这导致所有非 ASCII 字符串被破坏成 mojibake。
//
// 修法：base64 包装保证所有 byte 都 < 0x80（base64 是纯 ASCII），
// Worker 端拿到 string 后用 latin1 → bytes 还原成原 byte 序列，
// 再按 base64 解码 + UTF-8 解码，得到原始 Unicode 字符串。

function fromLatin1String(mangled: string): Uint8Array {
  // 逐字符取 charCode，因为 OpenNext 的 string 实际上"每个字符存的是原 byte 值"
  const len = mangled.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = mangled.charCodeAt(i) & 0xff;
  return bytes;
}

function readKvAsString(key: string): string | null {
  const kv = getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    if (!raw) return null;
    // OpenNext 把 string 字符的 charCode 当作原 byte 值（latin1 解释）
    const bytes = fromLatin1String(raw);
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return null;
  }
}

// JSON 值在 KV 中的编码：b64(<json>)，前缀 `B64:` 标识。
// 旧版本未加前缀的明文 JSON 数据，读取时若解码失败回退到原值（兼容旧数据）。
const B64_PREFIX_BYTES = new Uint8Array([0x42, 0x36, 0x34, 0x3a]); // "B64:"
const B64_PREFIX_STR = 'B64:';

export async function kvGetJson<T>(key: string): Promise<T | null> {
  const kv = getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    if (!raw) return null;
    // 1) OpenNext 反向解码：把 string 当 latin1 还原成原 byte
    const bytes = fromLatin1String(raw);
    // 2) 检查是否 base64 包装
    if (
      bytes.length >= B64_PREFIX_BYTES.length &&
      bytes[0] === B64_PREFIX_BYTES[0] &&
      bytes[1] === B64_PREFIX_BYTES[1] &&
      bytes[2] === B64_PREFIX_BYTES[2] &&
      bytes[3] === B64_PREFIX_BYTES[3]
    ) {
      // base64 解码 + UTF-8 解码
      const b64 = new TextDecoder('latin1').decode(bytes.subarray(B64_PREFIX_BYTES.length));
      const jsonBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      return JSON.parse(new TextDecoder('utf-8').decode(jsonBytes)) as T;
    }
    // 3) 旧数据回退（非 base64 包装）：按 UTF-8 解码字节后 JSON.parse
    try {
      return JSON.parse(new TextDecoder('utf-8').decode(bytes)) as T;
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
  // base64 包装确保所有 byte < 0x80，OpenNext 反向解码后能正确还原
  const jsonBytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < jsonBytes.length; i++) binary += String.fromCharCode(jsonBytes[i]);
  const b64 = btoa(binary);
  await kv.put(key, B64_PREFIX_STR + b64);
}

export async function kvSetRaw(key: string, value: string): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  await kv.put(key, B64_PREFIX_STR + btoa(binary));
}

export async function kvGetRaw(key: string): Promise<string | null> {
  const kv = getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    if (!raw) return null;
    const bytes = fromLatin1String(raw);
    if (
      bytes.length >= B64_PREFIX_BYTES.length &&
      bytes[0] === B64_PREFIX_BYTES[0] &&
      bytes[1] === B64_PREFIX_BYTES[1] &&
      bytes[2] === B64_PREFIX_BYTES[2] &&
      bytes[3] === B64_PREFIX_BYTES[3]
    ) {
      const b64 = new TextDecoder('latin1').decode(bytes.subarray(B64_PREFIX_BYTES.length));
      const out = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(out);
    }
    return new TextDecoder('utf-8').decode(bytes);
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

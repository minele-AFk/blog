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
  put(key: string, value: string): Promise<void>;
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

export async function kvGetJson<T>(key: string): Promise<T | null> {
  const kv = getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function kvSetJson(key: string, value: unknown): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  await kv.put(key, JSON.stringify(value));
}

export async function kvSetRaw(key: string, value: string): Promise<void> {
  const kv = getKv();
  if (!kv) return;
  await kv.put(key, value);
}

export async function kvGetRaw(key: string): Promise<string | null> {
  const kv = getKv();
  if (!kv) return null;
  return kv.get(key);
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

import fs from 'fs';
import path from 'path';
import { isCloudflare, kvGetJson, kvSetJson, kvDelete, kvListKeys } from './storage';

// 音乐 API 结果缓存（防止高频请求第三方接口触发限流）
// 结构：{ [key]: { data, ts } }
const CACHE_FILE = path.join(process.cwd(), 'data', 'music-cache.json');

// 缓存条目有效期：30 分钟（与 /api/music 的 CACHE_TTL_MS 一致）
const CACHE_TTL_MS = 30 * 60 * 1000;
// 缓存条目上限（本地 fs 模式）：防止文件无限增长，超出时按最旧优先淘汰
const MAX_ENTRIES = 500;
// KV 模式 key 前缀：music: 命名空间，便于按前缀清理
const KV_PREFIX = 'music:';

type CacheEntry = {
  data: unknown;
  ts: number;
};

let cache: Record<string, CacheEntry> | null = null;

// ---------- 本地 fs 模式（保留原逻辑） ----------

const loadCache = (): Record<string, CacheEntry> => {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    cache = {};
  }
  const entries = cache ?? {};
  // 惰性清理：剔除过期条目，避免文件只增不减
  const now = Date.now();
  const expiredKeys = Object.entries(entries)
    .filter(([, entry]) => now - (entry?.ts ?? 0) > CACHE_TTL_MS)
    .map(([key]) => key);
  if (expiredKeys.length > 0) {
    for (const key of expiredKeys) delete entries[key];
    saveCache();
  }
  return entries;
};

const saveCache = () => {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    // 原子写入：先写临时文件再 rename，防止写入中途崩溃导致 JSON 损坏
    const tmpPath = `${CACHE_FILE}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(cache ?? {}, null, 2));
    fs.renameSync(tmpPath, CACHE_FILE);
  } catch {
    // 缓存写入失败不影响主流程
  }
};

// ---------- 统一读取：本地 fs ↔ Workers KV ----------

export const getMusicCache = async <T>(key: string): Promise<T | null> => {
  if (isCloudflare()) {
    const entry = await kvGetJson<CacheEntry>(`${KV_PREFIX}${key}`);
    if (!entry) return null;
    // TTL 检查：过期视为未命中
    if (Date.now() - (entry.ts ?? 0) > CACHE_TTL_MS) {
      void kvDelete(`${KV_PREFIX}${key}`).catch(() => undefined);
      return null;
    }
    return entry.data as T;
  }
  const entry = loadCache()[key];
  return entry ? (entry.data as T) : null;
};

export const getMusicCacheTs = async (key: string): Promise<number> => {
  if (isCloudflare()) {
    const entry = await kvGetJson<CacheEntry>(`${KV_PREFIX}${key}`);
    return entry?.ts ?? 0;
  }
  return loadCache()[key]?.ts ?? 0;
};

export const setMusicCache = async (key: string, data: unknown) => {
  const entry: CacheEntry = { data, ts: Date.now() };
  if (isCloudflare()) {
    await kvSetJson(`${KV_PREFIX}${key}`, entry);
    return;
  }
  loadCache()[key] = entry;
  // 大小上限：超出时按最旧优先淘汰，避免缓存文件无限膨胀
  const entries = Object.entries(cache ?? {});
  if (entries.length > MAX_ENTRIES) {
    const overflow = entries.length - MAX_ENTRIES;
    const oldest = entries
      .sort((a, b) => (a[1]?.ts ?? 0) - (b[1]?.ts ?? 0))
      .slice(0, overflow);
    for (const [oldKey] of oldest) delete cache![oldKey];
  }
  saveCache();
};

// KV 模式清理过期音乐缓存（可定时或按需调用；本地模式由 loadCache 惰性清理）
export const cleanupMusicCache = async (): Promise<void> => {
  if (!isCloudflare()) return;
  try {
    const keys = await kvListKeys(KV_PREFIX);
    const now = Date.now();
    await Promise.all(
      keys.map(async (key) => {
        const entry = await kvGetJson<CacheEntry>(key);
        if (!entry || now - (entry.ts ?? 0) > CACHE_TTL_MS) {
          await kvDelete(key);
        }
      })
    );
  } catch {
    // 清理失败不影响主流程
  }
};

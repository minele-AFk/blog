import fs from 'fs';
import path from 'path';

// 音乐 API 结果缓存（防止高频请求第三方接口触发限流）
// 结构：{ [key]: { data, ts } }
const CACHE_FILE = path.join(process.cwd(), 'data', 'music-cache.json');

// 缓存条目有效期：30 分钟（与 /api/music 的 CACHE_TTL_MS 一致）
const CACHE_TTL_MS = 30 * 60 * 1000;
// 缓存条目上限：防止文件无限增长，超出时按最旧优先淘汰
const MAX_ENTRIES = 500;

type CacheEntry = {
  data: unknown;
  ts: number;
};

let cache: Record<string, CacheEntry> | null = null;

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

export const getMusicCache = <T>(key: string): T | null => {
  const entry = loadCache()[key];
  return entry ? (entry.data as T) : null;
};

export const getMusicCacheTs = (key: string): number => {
  return loadCache()[key]?.ts ?? 0;
};

export const setMusicCache = (key: string, data: unknown) => {
  loadCache()[key] = { data, ts: Date.now() };
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

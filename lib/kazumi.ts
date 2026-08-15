import { Anime, AnimeStatus } from './types';

const BANGUMI_API = 'https://api.bgmapi.com';
const BANGUMI_TOKEN = process.env.BANGUMI_TOKEN || '';
const USER_AGENT = 'personal-blog/1.0';

// Bangumi API 收藏类型 -> AnimeStatus
const BANGUMI_TYPE_MAP: Record<number, AnimeStatus> = {
  1: 'plan_to_watch',
  2: 'completed',
  3: 'watching',
  4: 'on_hold',
  5: 'dropped',
};

// 缓存有效期：24 小时
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// API 请求超时：15 秒
const API_TIMEOUT_MS = 15000;

// 同步锁：防止并发同步导致文件损坏
let syncPromise: Promise<Anime[]> | null = null;

// 检查配置是否完整
function checkConfig(): void {
  if (!BANGUMI_TOKEN) {
    throw new Error('BANGUMI_TOKEN 环境变量未设置');
  }
}

// 同步配置是否就绪（供前端提示管理员）
export const isConfigReady = (): boolean => !!BANGUMI_TOKEN;

// 带超时的 fetch
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`请求超时: ${url}`);
    }
    throw error;
  }
}

// Bangumi 收藏响应内嵌的 subject 结构（仅用到的字段）
interface BangumiSubject {
  name?: string;
  name_cn?: string;
  images?: { large?: string };
  summary?: string;
}

interface BangumiCollectionItem {
  subject_id: number;
  subject?: BangumiSubject;
  tags?: string[];
}

interface BangumiCollectionPage {
  data?: BangumiCollectionItem[];
  total?: number;
}

interface BangumiMe {
  username?: string;
}

async function apiGet<T>(path: string): Promise<T> {
  checkConfig();
  const res = await fetchWithTimeout(`${BANGUMI_API}${path}`, {
    headers: {
      Authorization: `Bearer ${BANGUMI_TOKEN}`,
      'User-Agent': USER_AGENT,
    },
  });
  if (!res.ok) throw new Error(`Bangumi API 请求失败: ${res.status}`);
  return res.json() as Promise<T>;
}

interface CollectionItem {
  subjectId: number;
  subject?: BangumiSubject;
  tags: string[];
  status: AnimeStatus;
}

// 拉取某一收藏类型的全部分页（保留翻页限速，避免触发 Bangumi 限流）
async function fetchCollectionsByType(username: string, type: number): Promise<CollectionItem[]> {
  const status = BANGUMI_TYPE_MAP[type];
  const result: CollectionItem[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = await apiGet<BangumiCollectionPage>(
      `/v0/users/${username}/collections?subject_type=2&limit=${limit}&offset=${offset}&type=${type}`
    );
    if (!data.data || data.data.length === 0) break;

    for (const item of data.data) {
      result.push({
        subjectId: item.subject_id,
        // collections 响应内嵌完整 subject（name/name_cn/images/summary），无需逐部请求详情接口
        subject: item.subject,
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 10) : [],
        status,
      });
    }

    if (offset + data.data.length >= (data.total ?? 0)) break;
    offset += limit;
    await new Promise((r) => setTimeout(r, 250)); // 限速
  }

  return result;
}

// 同步所有番剧数据（调用 Bangumi API）
async function syncFromBangumi(): Promise<Anime[]> {
  // 1. 获取用户名
  const me = await apiGet<BangumiMe>('/v0/me');
  const username = me.username ?? '';

  // 2. 5 种收藏类型并行拉取，避免串行等待
  const results = await Promise.all(
    Object.keys(BANGUMI_TYPE_MAP).map((typeStr) =>
      fetchCollectionsByType(username, parseInt(typeStr))
    )
  );

  // 3. 直接使用收藏响应内嵌的 subject 信息组装
  const animeList: Anime[] = results
    .flat()
    .map(({ subjectId, subject, tags, status }) => ({
      id: String(subjectId),
      name: subject?.name_cn || subject?.name || '',
      cover: (subject?.images?.large || '').replace(/^http:/, 'https:'),
      tags,
      synopsis: subject?.summary || '',
      status,
    }))
    .filter((a) => a.name);

  return animeList;
}

// 缓存数据结构
interface AnimeCache {
  data: Anime[];
  lastSync: number; // 时间戳
}

// 读取缓存
async function getCache(): Promise<AnimeCache | null> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const cachePath = path.join(process.cwd(), 'data', 'anime.json');
  try {
    const raw = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(raw) as AnimeCache;
  } catch {
    return null;
  }
}

// 保存缓存
async function setCache(animeList: Anime[]): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  const cachePath = path.join(dataDir, 'anime.json');
  const cache: AnimeCache = {
    data: animeList,
    lastSync: Date.now(),
  };
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
}

// 检查缓存是否过期
async function isCacheExpired(): Promise<boolean> {
  const cache = await getCache();
  if (!cache) return true;
  return Date.now() - cache.lastSync > CACHE_TTL_MS;
}

// 获取番剧数据（优先缓存，过期则自动同步）
export async function getAnimeList(autoSync = true): Promise<Anime[]> {
  const cache = await getCache();

  // 缓存有效，直接返回
  if (cache && Date.now() - cache.lastSync <= CACHE_TTL_MS) {
    return cache.data;
  }

  // 缓存过期或不存在
  if (!autoSync) {
    // 不自动同步，返回旧缓存或空数组
    return cache?.data || [];
  }

  // 自动同步（在后台执行）
  try {
    const animeList = await syncFromBangumi();
    await setCache(animeList);
    return animeList;
  } catch (error) {
    console.error('自动同步失败:', error);
    // 同步失败，返回旧缓存
    return cache?.data || [];
  }
}

// 手动触发同步（带锁，防止并发）
export async function syncFromKazumi(): Promise<Anime[]> {
  // 如果已有同步正在进行，直接返回该 Promise
  if (syncPromise) {
    return syncPromise;
  }

  syncPromise = (async () => {
    try {
      const animeList = await syncFromBangumi();
      await setCache(animeList);
      return animeList;
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

// 获取缓存状态（供前端显示）
export async function getCacheStatus(): Promise<{
  lastSync: number | null;
  expired: boolean;
  count: number;
  syncing: boolean;
}> {
  const cache = await getCache();
  if (!cache) {
    return { lastSync: null, expired: true, count: 0, syncing: !!syncPromise };
  }
  return {
    lastSync: cache.lastSync,
    expired: Date.now() - cache.lastSync > CACHE_TTL_MS,
    count: cache.data.length,
    syncing: !!syncPromise,
  };
}

export async function getCachedAnime(): Promise<Anime[]> {
  const cache = await getCache();
  if (cache && Date.now() - cache.lastSync <= CACHE_TTL_MS) {
    return cache.data;
  }
  // 缓存过期：立即返回旧缓存（如有），后台静默同步，不阻塞本次请求
  void syncFromKazumi().catch((err) => console.error('后台同步失败:', err));
  return cache?.data || [];
}

export async function saveAnimeCache(animeList: Anime[]): Promise<void> {
  await setCache(animeList);
}

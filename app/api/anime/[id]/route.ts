import { NextRequest, NextResponse } from 'next/server';
import { getCachedAnime } from '@/lib/kazumi';

const BANGUMI_API = 'https://api.bgmapi.com';
const BANGUMI_TOKEN = process.env.BANGUMI_TOKEN || '';
const USER_AGENT = 'personal-blog/1.0';

// 详情缓存有效期：7 天（详情数据相对稳定，避免每次实时请求外部 API）
const DETAIL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface DetailCache {
  data: unknown;
  updatedAt: number;
}

// 读取详情缓存
async function getDetailCache(id: string): Promise<DetailCache | null> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const cachePath = path.join(process.cwd(), 'data', 'anime-detail-cache.json');
    const raw = await fs.readFile(cachePath, 'utf-8');
    const all = JSON.parse(raw) as Record<string, DetailCache>;
    const entry = all[id];
    if (!entry) return null;
    // 未过期才返回
    if (Date.now() - entry.updatedAt > DETAIL_TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

// 保存详情缓存
async function setDetailCache(id: string, data: unknown): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });
    const cachePath = path.join(dataDir, 'anime-detail-cache.json');

    let all: Record<string, DetailCache> = {};
    try {
      const raw = await fs.readFile(cachePath, 'utf-8');
      all = JSON.parse(raw);
    } catch {
      all = {};
    }

    all[id] = { data, updatedAt: Date.now() };

    // 只保留最近 200 条，防止文件无限增长
    const keys = Object.keys(all);
    if (keys.length > 200) {
      const sorted = keys.sort(
        (a, b) => (all[b].updatedAt ?? 0) - (all[a].updatedAt ?? 0)
      );
      for (const k of sorted.slice(200)) {
        delete all[k];
      }
    }

    await fs.writeFile(cachePath, JSON.stringify(all), 'utf-8');
  } catch (error) {
    console.error('保存详情缓存失败:', error);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ success: false, error: '缺少番剧ID' }, { status: 400 });
  }

  try {
    // 1. 命中缓存则直接返回（并附带列表中的状态信息）
    const cached = await getDetailCache(id);
    if (cached) {
      const status = await findStatus(id);
      return NextResponse.json({ success: true, data: { ...(cached.data as object), status } });
    }

    // 2. 未命中，请求 Bangumi API
    const headers: Record<string, string> = {
      'User-Agent': USER_AGENT,
    };

    if (BANGUMI_TOKEN) {
      headers['Authorization'] = `Bearer ${BANGUMI_TOKEN}`;
    }

    const detailRes = await fetch(`${BANGUMI_API}/v0/subjects/${id}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!detailRes.ok) {
      return NextResponse.json({ success: false, error: '获取番剧详情失败' }, { status: 502 });
    }
    const detail = await detailRes.json();

    // 解析 infobox
    const infobox: Record<string, string> = {};
    if (Array.isArray(detail.infobox)) {
      for (const item of detail.infobox as Array<{ key?: string; value?: unknown }>) {
        if (item.key && item.value !== undefined) {
          let val: unknown = item.value;
          if (Array.isArray(item.value)) {
            val = item.value
              .map((v: unknown) =>
                v && typeof v === 'object' && 'v' in v ? (v as { v: unknown }).v : v
              )
              .join(', ');
          }
          infobox[item.key] = String(val);
        }
      }
    }

    // 评分分布
    const rating = detail.rating || {};
    const ratingCount = rating.count || {};
    const votesCount = Array.from({ length: 10 }, (_, i) => ratingCount[String(i + 1)] || 0);

    const result = {
      id: String(detail.id),
      name: detail.name_cn || detail.name,
      nameOriginal: detail.name || '',
      cover: detail.images?.large?.replace(/^http:/, 'https:') || '',
      synopsis: detail.summary || '',
      tags: detail.tags?.map((t: { name?: string }) => t.name || '').slice(0, 15) || [],
      airDate: detail.date || '',
      type: detail.type || 0,
      rank: detail.rating?.rank || 0,
      ratingScore: rating.score || 0,
      votes: rating.total || 0,
      votesCount,
      infobox,
      totalEpisodes: detail.total_episodes || detail.eps_count || 0,
      nsfw: detail.nsfw || false,
    };

    // 3. 写缓存（不阻塞响应）
    void setDetailCache(id, result);

    const status = await findStatus(id);
    return NextResponse.json({ success: true, data: { ...result, status } });
  } catch (error) {
    console.error('获取番剧详情失败:', error);
    return NextResponse.json({ success: false, error: '获取番剧详情失败' }, { status: 500 });
  }
}

// 从本地列表中查找该番剧的收藏状态
async function findStatus(id: string): Promise<string | undefined> {
  try {
    const list = await getCachedAnime();
    const found = list.find((a) => String(a.id) === String(id));
    return found?.status;
  } catch {
    return undefined;
  }
}

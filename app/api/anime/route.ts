import { NextResponse } from 'next/server';
import { getAnimeList, getCacheStatus, syncFromKazumi, isConfigReady } from '@/lib/kazumi';

export async function GET() {
  try {
    // 缓存有效时直接返回；过期时先返回旧缓存，同步在后台异步执行
    const data = await getAnimeList(false);
    const status = await getCacheStatus();

    // 缓存过期：后台异步同步，不阻塞本次响应
    if (status.expired && isConfigReady()) {
      void syncFromKazumi()
        .catch((err) => console.error('后台同步失败:', err));
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        count: data.length,
        lastSync: status.lastSync,
        expired: status.expired,
        syncing: status.syncing,
        configReady: isConfigReady(),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '获取番剧数据失败' }, { status: 500 });
  }
}

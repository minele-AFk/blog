import { NextResponse } from 'next/server';
import { syncFromKazumi, getCacheStatus } from '@/lib/kazumi';

// 简单的 token 验证（防止被随意调用）
// - 外部 cron（如 cron-job.org）：Authorization: Bearer <CRON_SECRET|ADMIN_TOKEN>
// - Cloudflare Cron Triggers：触发请求不携带 header，靠 User-Agent 识别（cf 内部调度）
//   风险可控：同步功能自带并发锁与接口限速，最坏情况仅是触发一次 Bangumi 拉取
function authValid(req: Request): boolean {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    // 使用环境变量 CRON_SECRET 验证（与 Vercel Cron 一致）
    if (token === process.env.CRON_SECRET || token === process.env.ADMIN_TOKEN) {
      return true;
    }
  }
  const ua = req.headers.get('user-agent') ?? '';
  return ua.startsWith('Cloudflare');
}

export async function POST(req: Request) {
  // 验证请求来源
  if (!authValid(req)) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
  }

  try {
    const before = await getCacheStatus();
    const animeList = await syncFromKazumi();
    const after = await getCacheStatus();

    return NextResponse.json({
      success: true,
      message: '定时同步完成',
      data: {
        count: animeList.length,
        previousSync: before.lastSync,
        currentSync: after.lastSync,
      },
    });
  } catch (error) {
    console.error('定时同步失败:', error);
    return NextResponse.json({ success: false, error: '同步失败' }, { status: 500 });
  }
}

// 不支持 GET 请求（仅允许 POST 以提高安全性）
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

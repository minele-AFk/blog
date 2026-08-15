import { NextResponse } from 'next/server';
import { syncFromKazumi } from '@/lib/kazumi';
import { verifyToken } from '@/lib/auth';

export async function POST(req: Request) {
  // 验证管理员身份
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
  }
  const token = auth.slice(7);
  if (!verifyToken(token)) {
    return NextResponse.json({ success: false, error: 'Token 无效' }, { status: 401 });
  }

  try {
    // syncFromKazumi 内部已写入缓存，此处不再重复写，避免覆盖管理员的状态修改
    const animeList = await syncFromKazumi();
    return NextResponse.json({ success: true, data: animeList, count: animeList.length });
  } catch (error) {
    console.error('同步失败:', error);
    // 透出具体错误原因（如未配置 BANGUMI_TOKEN），方便管理员排查
    const message = error instanceof Error ? error.message : '同步失败';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

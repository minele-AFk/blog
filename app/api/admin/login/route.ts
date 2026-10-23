import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken, hasAdminPassword, initializeAdminIfNeeded } from '@/lib/auth';
import { allowLoginAttempt } from '@/lib/login-rate-limit';
import { readJsonObject, RequestError, text, withApiErrors } from '@/lib/request-security';

export const POST = withApiErrors(async (request: NextRequest) => {
  if (!(await allowLoginAttempt(request))) {
    return NextResponse.json({ error: '登录尝试过多，请稍后再试' }, {
      status: 429, headers: { 'Retry-After': '900', 'Cache-Control': 'no-store' },
    });
  }
  const body = await readJsonObject(request, 4096);
  const password = text(body.password, 72, true);
  if (Buffer.byteLength(password, 'utf8') > 72) throw new RequestError('密码不能超过 72 UTF-8 字节');
  if (!(await hasAdminPassword()) && !(await initializeAdminIfNeeded())) {
    return NextResponse.json({ error: '管理员尚未初始化，请在服务器配置 ADMIN_PASSWORD' }, { status: 403 });
  }
  if (!(await verifyPassword(password))) return NextResponse.json({ error: '密码错误' }, { status: 401 });
  return NextResponse.json({ success: true, token: generateToken() }, { headers: { 'Cache-Control': 'no-store' } });
});

export async function GET() {
  const hasPassword = await hasAdminPassword();
  const initializable = !hasPassword && !!process.env.ADMIN_PASSWORD;
  return NextResponse.json({ hasPassword, initializable }, { headers: { 'Cache-Control': 'no-store' } });
}

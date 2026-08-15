import { NextRequest, NextResponse } from 'next/server';
import {
  verifyPassword,
  generateToken,
  hasAdminPassword,
  initializeAdminIfNeeded,
} from '../../../../lib/auth';

// ---- IP 级登录限流：失败 5 次锁定 15 分钟，防暴力破解 ----
interface RateLimitEntry {
  failures: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const MAX_FAILURES = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 分钟

const getClientIp = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
};

const recordFailure = (ip: string) => {
  const entry = loginAttempts.get(ip);
  const failures = (entry?.failures ?? 0) + 1;
  if (failures >= MAX_FAILURES) {
    loginAttempts.set(ip, { failures, lockedUntil: Date.now() + LOCK_DURATION });
  } else {
    loginAttempts.set(ip, { failures, lockedUntil: 0 });
  }
};

const clearFailures = (ip: string) => {
  loginAttempts.delete(ip);
};

const isLocked = (ip: string): boolean => {
  const entry = loginAttempts.get(ip);
  if (!entry || entry.lockedUntil === 0) return false;
  if (Date.now() > entry.lockedUntil) {
    loginAttempts.delete(ip); // 锁定期已过，清理
    return false;
  }
  return true;
};

// 定期清理过期条目，防止 Map 无限增长
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts) {
    if (entry.lockedUntil !== 0 && now > entry.lockedUntil) loginAttempts.delete(ip);
  }
}, LOCK_DURATION).unref?.();

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  if (isLocked(ip)) {
    return NextResponse.json(
      { error: '登录失败次数过多，已锁定 15 分钟，请稍后再试' },
      { status: 429 }
    );
  }

  let password = '';
  try {
    const body = await request.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: '密码不能为空' }, { status: 400 });
  }

  if (!hasAdminPassword()) {
    // 未初始化：仅允许通过 ADMIN_PASSWORD 环境变量初始化，拒绝匿名抢注
    const initialized = initializeAdminIfNeeded();
    if (!initialized) {
      return NextResponse.json(
        { error: '管理员尚未初始化：请在服务器配置 ADMIN_PASSWORD 环境变量后重启，或联系部署者完成初始化' },
        { status: 403 }
      );
    }
    // 已初始化，输入的密码必须与 ADMIN_PASSWORD 一致才发放 token
    if (!verifyPassword(password)) {
      recordFailure(ip);
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }
    clearFailures(ip);
    const token = generateToken();
    return NextResponse.json({
      success: true,
      token,
      message: '已通过环境变量初始化并登录',
    });
  }

  if (!verifyPassword(password)) {
    recordFailure(ip);
    return NextResponse.json({ error: '密码错误' }, { status: 401 });
  }

  clearFailures(ip);
  const token = generateToken();
  return NextResponse.json({ success: true, token });
}

export async function GET() {
  const hasPassword = hasAdminPassword();
  // initializable: 尚未初始化且已配置 ADMIN_PASSWORD 环境变量（前端据此提示可输入密码完成初始化）
  const initializable = !hasPassword && !!process.env.ADMIN_PASSWORD;
  return NextResponse.json({ hasPassword, initializable });
}

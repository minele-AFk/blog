// 站点 URL 统一入口
// 环境变量未配置或无合法协议时安全降级，避免 new URL() 抛 TypeError 导致构建失败
const DEFAULT_SITE_URL = 'https://xizi-duo-qiu.example.com';

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return DEFAULT_SITE_URL;
  try {
    return new URL(raw).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

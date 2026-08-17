// 从友链 URL 解析 GitHub 用户名，生成统一的 GitHub 头像地址
// 支持 xxx.github.io 与 github.com/xxx 两种形式
// 返回的是 /api/avatar 代理地址（解决国内访问 avatars.githubusercontent.com 不稳）
export function getGithubAvatar(url: string): string | null {
  if (!url) return null;
  let avatarUrl: string | null = null;
  try {
    const u = new URL(url);
    if (u.hostname === 'github.com' || u.hostname === 'www.github.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length > 0) avatarUrl = `https://avatars.githubusercontent.com/${parts[0]}`;
    } else {
      const m = u.hostname.match(/^([a-zA-Z0-9-]+)\.github\.io$/);
      if (m) avatarUrl = `https://avatars.githubusercontent.com/${m[1]}`;
    }
  } catch {
    return null;
  }
  if (!avatarUrl) return null;
  return `/api/avatar?u=${encodeURIComponent(avatarUrl)}`;
}

// 从友链 URL 解析 GitHub 用户名，生成统一的 GitHub 头像
// 支持 xxx.github.io 与 github.com/xxx 两种形式
export function getGithubAvatar(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // github.com/username 或 www.github.com/username
    if (u.hostname === 'github.com' || u.hostname === 'www.github.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length > 0) return `https://avatars.githubusercontent.com/${parts[0]}`;
    }
    // username.github.io
    const m = u.hostname.match(/^([a-zA-Z0-9-]+)\.github\.io$/);
    if (m) return `https://avatars.githubusercontent.com/${m[1]}`;
  } catch {
    // 非法 URL 直接忽略
  }
  return null;
}

// Windows 保留设备名（大小写不敏感），写入时会导致系统错误
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

/**
 * 校验文章 slug 是否合法：仅允许字母、数字、下划线、连字符，长度 1-100，
 * 且不能是 Windows 保留设备名。
 * 用于防止 path.join 路径穿越（../../ 逃逸 posts 目录）。
 */
export const isValidSlug = (slug: string): boolean => {
  if (typeof slug !== 'string' || slug.length === 0 || slug.length > 100) return false;
  return /^[\w-]{1,100}$/.test(slug) && !WINDOWS_RESERVED.test(slug);
};

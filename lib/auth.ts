import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const ADMIN_DATA_PATH = path.join(process.cwd(), 'data', 'admin.json');

// 开发环境未配置 JWT_SECRET 时的缓存随机密钥（模块级，仅生成一次）
let cachedDevSecret: string | null = null;

export const getJwtSecret = () => {
  // 优先使用环境变量
  if (process.env.JWT_SECRET) {
    // 生产环境拒绝弱密钥与公开占位符（.env.example 中的示例值）
    if (process.env.NODE_ENV === 'production' && (process.env.JWT_SECRET.length < 32 || /your-jwt-secret/i.test(process.env.JWT_SECRET))) {
      throw new Error('JWT_SECRET 强度不足：生产环境密钥长度需 ≥ 32 字符且不能使用示例占位符，请参考 .env.example 生成强密钥');
    }
    return process.env.JWT_SECRET;
  }

  // 生产环境必须显式配置 JWT_SECRET，否则拒绝运行
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET 环境变量未设置：生产环境必须配置 JWT_SECRET，请参考 .env.example');
  }

  // 开发环境：缓存随机密钥，保证签名与验签使用同一密钥
  if (!cachedDevSecret) {
    cachedDevSecret = 'jwt-' + crypto.randomBytes(32).toString('hex');
    console.warn('⚠️  警告: JWT_SECRET 环境变量未设置，开发环境使用临时随机密钥（重启后需重新登录）。');
  }
  return cachedDevSecret;
};

export const verifyToken = (token: string) => {
  const secret = getJwtSecret();
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] }) as { userId: string };
  } catch {
    return null;
  }
};

export const generateToken = () => {
  return jwt.sign({ userId: 'admin' }, getJwtSecret(), { expiresIn: '24h' });
};

export const getAdminPasswordHash = (): string | null => {
  if (!fs.existsSync(ADMIN_DATA_PATH)) {
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(ADMIN_DATA_PATH, 'utf8'));
    return typeof data.passwordHash === 'string' ? data.passwordHash : null;
  } catch {
    return null;
  }
};

export const setAdminPassword = (password: string) => {
  const passwordHash = bcrypt.hashSync(password, 10);

  const data = {
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(ADMIN_DATA_PATH), { recursive: true });
  fs.writeFileSync(ADMIN_DATA_PATH, JSON.stringify(data, null, 2));
};

export const verifyPassword = (password: string) => {
  const passwordHash = getAdminPasswordHash();
  if (!passwordHash) return false;

  try {
    return bcrypt.compareSync(password, passwordHash);
  } catch {
    return false;
  }
};

export const hasAdminPassword = () => {
  return getAdminPasswordHash() !== null;
};

/**
 * 未初始化管理员密码时，若配置了 ADMIN_PASSWORD 环境变量则自动初始化。
 * @returns true=已通过环境变量初始化；false=无需初始化或未配置环境变量
 */
export const initializeAdminIfNeeded = () => {
  if (hasAdminPassword()) return false;
  if (!process.env.ADMIN_PASSWORD) return false;

  setAdminPassword(process.env.ADMIN_PASSWORD);
  console.log('✅ 已通过 ADMIN_PASSWORD 环境变量初始化管理员密码。');
  return true;
};

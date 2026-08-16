import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, stat } from 'fs/promises';
import path from 'path';
import { verifyToken } from '../../../lib/auth';
import { isCloudflare, r2Put } from '../../../lib/storage';

// ---- 上传总量限制（本地 fs 模式），防止磁盘被塞满 ----
const MAX_FILES = 500; // uploads 目录最多文件数
const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 总大小上限 200MB

const getUploadStats = async (dir: string) => {
  let files = 0;
  let totalSize = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      files++;
      try {
        totalSize += (await stat(path.join(dir, entry.name))).size;
      } catch {
        // 单个文件读取失败忽略
      }
    }
  } catch {
    // 目录不存在视为空
  }
  return { files, totalSize };
};

// ---- 文件魔数校验：验证文件真实类型，防止伪造 MIME 上传恶意内容 ----
const matchesMagic = (buffer: Buffer, type: string): boolean => {
  const hex = buffer.subarray(0, 32).toString('hex').toLowerCase();
  switch (type) {
    case 'image/jpeg':
      return hex.startsWith('ffd8ff'); // JPEG
    case 'image/png':
      return hex.startsWith('89504e47'); // PNG
    case 'image/gif':
      return hex.startsWith('47494638'); // GIF8
    case 'image/webp':
      return hex.startsWith('52494646') && hex.slice(16, 24) === '57454250'; // RIFF....WEBP
    case 'image/avif':
      return hex.slice(8, 16) === '66747970' && (hex.slice(16, 24) === '61766966' || hex.slice(16, 24) === '61766973'); // ftyp avif/avis
    case 'image/svg+xml': {
      // SVG 是文本文件，检查开头内容
      const text = buffer.subarray(0, 1024).toString('utf8').trimStart();
      return text.startsWith('<svg') || text.startsWith('<?xml');
    }
    default:
      return false;
  }
};

export async function POST(request: NextRequest) {
  // 校验管理员 JWT，防止未登录用户滥用上传接口
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '不支持的文件类型，仅支持 jpg/png/gif/webp/svg/avif' }, { status: 400 });
    }

    // 限制文件大小 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '文件过大，最大支持 10MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 校验文件真实类型（魔数），防止伪造 MIME 上传恶意内容
    if (!matchesMagic(buffer, file.type)) {
      return NextResponse.json({ error: '文件内容与声称的类型不符，上传已拒绝' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/avif': 'avif',
    };
    const ext = extMap[file.type] || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // Workers：写入 R2（无磁盘）；本地：写入 public/uploads
    if (isCloudflare()) {
      const ok = await r2Put(filename, buffer, file.type);
      if (!ok) {
        return NextResponse.json({ error: '上传失败（R2 写入错误）' }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        url: `/uploads/${filename}`,
        message: '上传成功',
      });
    }

    await mkdir(uploadDir, { recursive: true });

    // 总量限制（本地模式）：文件数与总大小
    const { files, totalSize } = await getUploadStats(uploadDir);
    if (files >= MAX_FILES) {
      return NextResponse.json({ error: `图片数量已达上限（${MAX_FILES} 张），请先在管理后台清理` }, { status: 400 });
    }
    if (totalSize + buffer.length > MAX_TOTAL_SIZE) {
      return NextResponse.json({ error: '图片总大小已达上限（200MB），请先在管理后台清理' }, { status: 400 });
    }

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${filename}`,
      message: '上传成功',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
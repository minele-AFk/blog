import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { verifyToken } from '../../../../lib/auth';
import { isCloudflare, r2List, r2Delete } from '../../../../lib/storage';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];

const checkAuth = (request: NextRequest): boolean => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  return !!token && !!verifyToken(token);
};

const unauthorized = () =>
  NextResponse.json({ error: '未授权' }, { status: 401 });

// 校验文件名是否安全（仅允许 uploads 目录内的合法图片文件名，防路径穿越）
const isValidFilename = (filename: string): boolean => {
  if (!filename || filename !== path.basename(filename)) return false;
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXT.includes(ext);
};

// 列出已上传的图片
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) return unauthorized();

  try {
    // Workers：从 R2 列出（无磁盘）
    if (isCloudflare()) {
      const objects = await r2List();
      const files = objects
        .filter((obj) => ALLOWED_EXT.includes(path.extname(obj.key).toLowerCase()))
        .map((obj) => ({
          name: obj.key,
          size: obj.size,
          modifiedAt: obj.uploads?.toISOString?.() ?? new Date(0).toISOString(),
          url: `/uploads/${obj.key}`,
        }))
        .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      return NextResponse.json({ success: true, files, totalCount: files.length, totalSize });
    }

    // 本地：遍历 public/uploads
    let files: { name: string; size: number; modifiedAt: string; url: string }[] = [];
    try {
      const entries = await readdir(UPLOAD_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (!ALLOWED_EXT.includes(ext)) continue;
        try {
          const s = await stat(path.join(UPLOAD_DIR, entry.name));
          files.push({
            name: entry.name,
            size: s.size,
            modifiedAt: s.mtime.toISOString(),
            url: `/uploads/${entry.name}`,
          });
        } catch {
          // 单个文件读取失败忽略
        }
      }
    } catch {
      // 目录不存在视为空
    }

    files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    return NextResponse.json({ success: true, files, totalCount: files.length, totalSize });
  } catch {
    return NextResponse.json({ error: '获取图片列表失败' }, { status: 500 });
  }
}

// 删除已上传的图片
export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) return unauthorized();

  try {
    const body = await request.json();
    const filename = typeof body?.filename === 'string' ? body.filename : '';

    if (!isValidFilename(filename)) {
      return NextResponse.json({ error: '非法文件名' }, { status: 400 });
    }

    // Workers：删除 R2 对象；本地：删除文件
    if (isCloudflare()) {
      const ok = await r2Delete(filename);
      if (!ok) {
        return NextResponse.json({ error: '删除失败，文件可能不存在' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: '删除成功' });
    }

    const filePath = path.join(UPLOAD_DIR, filename);
    await unlink(filePath);
    return NextResponse.json({ success: true, message: '删除成功' });
  } catch {
    return NextResponse.json({ error: '删除失败，文件可能不存在' }, { status: 404 });
  }
}

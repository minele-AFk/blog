'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDialog from '@/components/ConfirmDialog';

interface GalleryFile {
  name: string;
  size: number;
  modifiedAt: string;
  url: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { hour12: false });
};

export default function AdminGalleryPage() {
  const { getToken } = useAuth();
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GalleryFile | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch('/api/admin/gallery', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
      } else {
        setError(data.error || '加载失败');
      }
    } catch {
      setError('加载失败，请检查网络');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDelete = (file: GalleryFile) => {
    setDeleteTarget(file);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.name);
    setError('');
    try {
      const token = getToken();
      const res = await fetch('/api/admin/gallery', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: deleteTarget.name }),
      });
      const data = await res.json();
      if (data.success) {
        setFiles((prev) => prev.filter((f) => f.name !== deleteTarget.name));
      } else {
        setError(data.error || '删除失败');
      }
    } catch {
      setError('删除失败，请检查网络');
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">图库管理</h1>
          <p className="text-sm text-gray-400 mt-1">
            共 {files.length} 张图片，占用 {formatSize(totalSize)}（上限 500 张 / 200MB）
          </p>
        </div>
        <button
          onClick={loadFiles}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"
          />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <ImageIcon className="w-16 h-16 mb-4 opacity-40" />
          <p className="text-lg">还没有上传过图片</p>
          <p className="text-sm mt-1">在说说、项目、友链的编辑弹窗中上传图片后会显示在这里</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {files.map((file) => (
            <motion.div
              key={file.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative bg-gray-800 rounded-xl overflow-hidden border border-gray-700"
            >
              <div className="aspect-square bg-gray-900 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-300 truncate" title={file.name}>{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatSize(file.size)} · {formatTime(file.modifiedAt)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(file)}
                disabled={deleting === file.name}
                className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 disabled:opacity-50"
                title="删除图片"
              >
                <Trash2 className={`w-4 h-4 ${deleting === file.name ? 'animate-pulse' : ''}`} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除图片"
        message={deleteTarget ? `确定删除图片「${deleteTarget.name}」吗？\n注意：如果它正被说说/项目引用，删除后对应位置会显示为破图。` : ''}
        confirmText="删除"
        loading={deleting !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={performDelete}
      />
    </div>
  );
}

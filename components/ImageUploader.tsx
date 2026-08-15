'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Link } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
}

export default function ImageUploader({ images, onChange, maxImages = 9, label = '图片' }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();

  const handleFileUpload = async (file: File) => {
    if (images.length >= maxImages) {
      alert(`最多上传 ${maxImages} 张图片`);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      alert('不支持的文件类型');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('文件过大，最大支持 10MB');
      return;
    }

    // 上传接口需要管理员 JWT，未登录时直接提示
    const token = getToken();
    if (!token) {
      alert('请先登录管理员账号后再上传图片');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        onChange([...images, data.url]);
      } else {
        alert(data.error || '上传失败');
      }
    } catch {
      alert('上传失败，请检查网络连接');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      handleFileUpload(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddUrl = () => {
    if (!urlValue.trim()) return;
    if (images.length >= maxImages) {
      alert(`最多上传 ${maxImages} 张图片`);
      return;
    }
    onChange([...images, urlValue.trim()]);
    setUrlValue('');
    setShowUrlInput(false);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground-muted">{label}</label>

      {/* 图片预览列表 */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence>
            {images.map((url, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-lg overflow-hidden group bg-white/5"
              >
                <img
                  src={url}
                  alt={`${label} ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/cover-placeholder.svg';
                  }}
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 上传区域 */}
      {images.length < maxImages && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-white/20 hover:border-purple-500/50 hover:bg-white/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full"
                />
                <span className="text-sm text-foreground-muted">上传中...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-foreground-muted" />
                <span className="text-sm text-foreground-muted">
                  拖拽图片到此处或点击上传
                </span>
                <span className="text-xs text-foreground-muted/60">
                  支持 jpg/png/gif/webp/avif，最大 10MB
                </span>
              </div>
            )}
          </div>

          {/* 外链输入切换 */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowUrlInput(!showUrlInput); }}
              className="flex items-center gap-1 text-xs text-foreground-muted hover:text-purple-400 transition-colors"
            >
              <Link className="w-3 h-3" />
              {showUrlInput ? '收起外链输入' : '使用外链图片'}
            </button>
          </div>

          <AnimatePresence>
            {showUrlInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2"
              >
                <input
                  type="url"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="输入图片 URL..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white text-sm placeholder-foreground-muted focus:outline-none focus:border-purple-500 transition-all"
                />
                <button
                  onClick={handleAddUrl}
                  disabled={!urlValue.trim()}
                  className="px-3 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  添加
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
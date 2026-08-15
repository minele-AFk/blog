'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  loading?: boolean;
}

export default function EditModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  onSubmit, 
  loading 
}: EditModalProps) {
  // 记录弹窗打开时间，用于防止"打开按钮被双击"导致弹窗刚弹出就被遮罩点击关闭
  const openedAtRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      openedAtRef.current = Date.now();
    }
  }, [isOpen]);

  const handleBackdropClick = () => {
    // 弹窗打开后 300ms 内忽略遮罩点击，防止误触关闭
    if (Date.now() - openedAtRef.current < 300) return;
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto glass-card neon-border p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-foreground-muted" />
              </button>
            </div>

            <div className="space-y-4">
              {children}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-white/5 text-foreground-muted hover:bg-white/10 transition-colors"
              >
                取消
              </button>
              {onSubmit && (
                <button
                  onClick={onSubmit}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 自定义确认弹窗：替代 window.confirm，行为完全可控，不依赖运行环境对原生 confirm 的实现
export default function ConfirmDialog({
  open,
  title = '确认操作',
  message,
  confirmText = '确定',
  cancelText = '取消',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm glass-card neon-border p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-foreground-muted text-sm leading-relaxed whitespace-pre-line">
                  {message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-white/5 text-foreground-muted hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '删除中...' : confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ImageUploader from '@/components/ImageUploader';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Moment {
  id: string;
  content: string;
  date: string;
  likes: number;
  comments: number;
  images: string[];
}

export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const [formData, setFormData] = useState({ content: '', date: '', images: [] as string[] });
  const { token } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchMoments();
  }, []);

  const fetchMoments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/moments');
      const data = await res.json();
      setMoments(data.data || []);
    } catch {
      setMoments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.content.trim()) return;

    try {
      if (editingMoment) {
        await fetch(`/api/admin/moments/${editingMoment.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch('/api/admin/moments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      setEditingMoment(null);
      setFormData({ content: '', date: '', images: [] });
      fetchMoments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/admin/moments/${deleteTarget}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMoments();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (moment: Moment) => {
    setEditingMoment(moment);
    setFormData({ content: moment.content, date: moment.date, images: moment.images || [] });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingMoment(null);
    setFormData({ content: '', date: new Date().toISOString().split('T')[0], images: [] });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">说说管理</h1>
          <p className="text-foreground-muted">管理您的说说内容</p>
        </div>
        <motion.button
          onClick={handleAdd}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          发布说说
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"
          />
        </div>
      ) : moments.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
          <p className="text-foreground-muted">暂无说说，点击上方按钮发布第一条</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {moments.map((moment) => (
              <motion.div
                key={moment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6 rounded-xl bg-gray-800/50 border border-gray-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white leading-relaxed mb-4">{moment.content}</p>
                    {moment.images && moment.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {moment.images.map((img, i) => (
                          <div key={i} className="aspect-square rounded-lg overflow-hidden">
                            <img
                              src={img}
                              alt={`Image ${i + 1}`}
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-sm text-foreground-muted">
                      <span>{moment.date}</span>
                      <span>点赞: {moment.likes}</span>
                      <span>评论: {moment.comments}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(moment)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-blue-500/20 transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(moment.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg p-6 rounded-xl bg-gray-800 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingMoment ? '编辑说说' : '发布说说'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    内容
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="写下您的心情..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    日期
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <ImageUploader
                  images={formData.images}
                  onChange={(images) => setFormData({ ...formData, images })}
                  maxImages={9}
                  label="图片"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.content.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                  {editingMoment ? '保存' : '发布'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除说说"
        message="确定要删除这条说说吗？"
        confirmText="删除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={performDelete}
      />
    </div>
  );
}

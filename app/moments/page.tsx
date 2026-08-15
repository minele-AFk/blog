'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Heart, Share2, Calendar, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import EditModal from '@/components/EditModal';
import ImageUploader from '@/components/ImageUploader';
import ConfirmDialog from '@/components/ConfirmDialog';

// 兼容 HTML5 拖拽（onDrop）与 framer-motion 拖拽事件的公共结构
interface DragLikeEvent {
  preventDefault: () => void;
  dataTransfer?: DataTransfer | null;
}

interface Moment {
  id: string;
  content: string;
  date: string;
  likes: number;
  comments: number;
  images?: string[];
}

export default function MomentsPage() {
  const { isAuthenticated, getToken } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({ content: '', images: [] as string[] });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    fetchMoments();
  }, []);

  const fetchMoments = async () => {
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

  const handleAddMoment = () => {
    setEditingMoment(null);
    setFormData({ content: '', images: [] });
    setShowModal(true);
  };

  const handleEditMoment = (moment: Moment) => {
    setEditingMoment(moment);
    setFormData({ content: moment.content, images: moment.images || [] });
    setShowModal(true);
  };

  const handleDeleteMoment = (id: string) => {
    setDeleteTarget(id);
  };

  const performDeleteMoment = async () => {
    if (!deleteTarget) return;
    try {
      const token = getToken();
      await fetch('/api/admin/moments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: deleteTarget }),
      });
      fetchMoments();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDragStart = (e: DragLikeEvent, index: number) => {
    e.dataTransfer?.setData('text/plain', index.toString());
    e.dataTransfer!.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: DragLikeEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    if (index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: DragLikeEvent, dropIndex: number) => {
    e.preventDefault();
    const draggedIdx = parseInt(e.dataTransfer?.getData('text/plain') || '-1');
    
    if (draggedIdx === dropIndex || isNaN(draggedIdx)) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newMoments = [...moments];
    const [draggedItem] = newMoments.splice(draggedIdx, 1);
    newMoments.splice(dropIndex, 0, draggedItem);

    setMoments(newMoments);
    setDraggedIndex(null);
    setDragOverIndex(null);

    try {
      const token = getToken();
      for (let i = 0; i < newMoments.length; i++) {
        await fetch('/api/admin/moments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id: newMoments[i].id, order: i }),
        });
      }
    } catch (e) {
      console.error(e);
      fetchMoments();
    }
  };

  const handleSave = async () => {
    setModalLoading(true);
    try {
      const images = formData.images;
      const token = getToken();
      
      if (editingMoment) {
        await fetch('/api/admin/moments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id: editingMoment.id, content: formData.content, images }),
        });
      } else {
        await fetch('/api/admin/moments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ content: formData.content, images }),
        });
      }
      
      setShowModal(false);
      fetchMoments();
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 page-header"
      >
        <div className="inline-flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">说说</h1>
        </div>
      </motion.div>

      {isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 flex justify-center"
        >
          <button
            onClick={handleAddMoment}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"
          >
            <Plus className="w-5 h-5" />
            发布新说说
          </button>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {moments.length > 0 ? (
            moments.map((moment, index) => (
              <motion.div
                key={moment.id}
                initial={isClient ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -2 }}
                className={`glass-card neon-border p-6 relative cursor-move ${
                  draggedIndex === index ? 'opacity-50 scale-95' : ''
                } ${dragOverIndex === index ? 'ring-2 ring-purple-500' : ''}`}
                draggable={isAuthenticated}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-purple-500/30">
                    <img
                      src="/763e1704988fb73ab9fcb11f80253667.jpg"
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-white">戏子多秋</span>
                      <span className="text-sm text-foreground-muted flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {moment.date}
                      </span>
                    </div>
                    <p className="text-white mb-4 leading-relaxed">
                      {moment.content}
                    </p>

                    {moment.images && moment.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {moment.images.map((img, i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                          >
                            <img
                              src={img}
                              alt={`Image ${i + 1}`}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                      <button className="flex items-center gap-2 text-foreground-muted hover:text-red-400 transition-colors">
                        <Heart className="w-5 h-5" />
                        <span className="text-sm">{moment.likes}</span>
                      </button>
                      <button className="flex items-center gap-2 text-foreground-muted hover:text-purple-400 transition-colors">
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm">{moment.comments}</span>
                      </button>
                      <button className="flex items-center gap-2 text-foreground-muted hover:text-blue-400 transition-colors">
                        <Share2 className="w-5 h-5" />
                        <span className="text-sm">分享</span>
                      </button>
                      {isAuthenticated && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditMoment(moment);
                            }}
                            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span className="text-sm">编辑</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMoment(moment.id);
                            }}
                            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm">删除</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="glass-card neon-border p-12 text-center"
            >
              <MessageCircle className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <p className="text-foreground-muted">暂无说说</p>
            </motion.div>
          )}
        </div>
      )}

      <EditModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingMoment ? '编辑说说' : '发布新说说'}
        onSubmit={handleSave}
        loading={modalLoading}
      >
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            内容
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="写点什么..."
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-foreground-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
            rows={4}
          />
        </div>
        <ImageUploader
          images={formData.images}
          onChange={(images) => setFormData({ ...formData, images })}
          maxImages={9}
          label="图片"
        />
      </EditModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除说说"
        message="确定要删除这条说说吗？"
        confirmText="删除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={performDeleteMoment}
      />
    </div>
  );
}
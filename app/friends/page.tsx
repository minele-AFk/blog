'use client';

import { motion } from 'framer-motion';
import { Users, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import EditModal from '@/components/EditModal';
import ConfirmDialog from '@/components/ConfirmDialog';

// 兼容 HTML5 拖拽（onDrop）与 framer-motion 拖拽事件的公共结构
interface DragLikeEvent {
  preventDefault: () => void;
  dataTransfer?: DataTransfer | null;
}

interface Friend {
  id: string;
  name: string;
  avatar: string;
  description: string;
  url: string;
  tags: string[];
}

export default function FriendsPage() {
  const { isAuthenticated, getToken } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', avatar: '', description: '', url: '', tags: '' });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const res = await fetch('/api/admin/friends');
      const data = await res.json();
      setFriends(data.data || []);
    } catch {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = () => {
    setEditingFriend(null);
    setFormData({ name: '', avatar: '', description: '', url: '', tags: '' });
    setShowModal(true);
  };

  const handleEditFriend = (friend: Friend) => {
    setEditingFriend(friend);
    setFormData({ name: friend.name, avatar: friend.avatar, description: friend.description, url: friend.url, tags: friend.tags.join(',') });
    setShowModal(true);
  };

  const handleDeleteFriend = (id: string) => {
    setDeleteTarget(id);
  };

  const performDeleteFriend = async () => {
    if (!deleteTarget) return;
    try {
      const token = getToken();
      await fetch('/api/admin/friends', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: deleteTarget }),
      });
      fetchFriends();
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

    const newFriends = [...friends];
    const [draggedItem] = newFriends.splice(draggedIdx, 1);
    newFriends.splice(dropIndex, 0, draggedItem);

    setFriends(newFriends);
    setDraggedIndex(null);
    setDragOverIndex(null);

    try {
      const token = getToken();
      for (let i = 0; i < newFriends.length; i++) {
        await fetch('/api/admin/friends', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id: newFriends[i].id, order: i }),
        });
      }
    } catch (e) {
      console.error(e);
      fetchFriends();
    }
  };

  const handleSave = async () => {
    setModalLoading(true);
    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      const token = getToken();
      
      if (editingFriend) {
        await fetch('/api/admin/friends', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id: editingFriend.id, ...formData, tags }),
        });
      } else {
        await fetch('/api/admin/friends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ ...formData, tags }),
        });
      }
      
      setShowModal(false);
      fetchFriends();
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 page-header"
      >
        <div className="inline-flex items-center gap-3">
          <Users className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">友情链接</h1>
        </div>
      </motion.div>

      {isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 flex justify-center"
        >
          <button
            onClick={handleAddFriend}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"
          >
            <Plus className="w-5 h-5" />
            添加友链
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {friends.length > 0 ? (
            friends.map((friend, index) => (
              <motion.div
                key={friend.id}
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
                <a
                  href={friend.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 group"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 border-purple-500/30 group-hover:border-purple-500/60 transition-colors">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors mb-1">
                      {friend.name}
                    </h3>
                    <p className="text-foreground-muted text-sm mb-2">
                      {friend.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {friend.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {isAuthenticated && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleEditFriend(friend);
                          }}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="text-sm">编辑</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDeleteFriend(friend.id);
                          }}
                          className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm">删除</span>
                        </button>
                      </div>
                    )}
                  </div>
                </a>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={isClient ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="glass-card neon-border p-12 text-center col-span-full"
            >
              <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <p className="text-foreground-muted">暂无友链</p>
            </motion.div>
          )}
        </div>
      )}

      <EditModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingFriend ? '编辑友链' : '添加友链'}
        onSubmit={handleSave}
        loading={modalLoading}
      >
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            名称
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="友链名称"
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-foreground-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            头像 URL
          </label>
          <input
            type="url"
            value={formData.avatar}
            onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
            placeholder="https://example.com/avatar.jpg"
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-foreground-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="友链描述..."
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-foreground-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            链接地址
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://example.com"
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-foreground-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            标签（用逗号分隔）
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="前端, 后端, 设计"
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-foreground-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>
      </EditModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除友链"
        message="确定要删除这个友链吗？"
        confirmText="删除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={performDeleteFriend}
      />
    </div>
  );
}
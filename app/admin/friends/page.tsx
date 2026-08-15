'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  description: string;
  url: string;
  tags: string[];
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
    description: '',
    url: '',
    tags: '',
  });
  const { token } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    setLoading(true);
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

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.url.trim()) return;

    try {
      const data = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      };

      if (editingFriend) {
        await fetch(`/api/admin/friends/${editingFriend.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/admin/friends', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
      }
      setShowModal(false);
      setEditingFriend(null);
      setFormData({ name: '', avatar: '', description: '', url: '', tags: '' });
      fetchFriends();
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
      await fetch(`/api/admin/friends/${deleteTarget}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchFriends();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (friend: Friend) => {
    setEditingFriend(friend);
    setFormData({
      name: friend.name,
      avatar: friend.avatar,
      description: friend.description,
      url: friend.url,
      tags: friend.tags.join(', '),
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingFriend(null);
    setFormData({ name: '', avatar: '', description: '', url: '', tags: '' });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">友链管理</h1>
          <p className="text-foreground-muted">管理您的友情链接</p>
        </div>
        <motion.button
          onClick={handleAdd}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          添加友链
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"
          />
        </div>
      ) : friends.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
          <p className="text-foreground-muted">暂无友链，点击上方按钮添加第一个友链</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {friends.map((friend) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-6 rounded-xl bg-gray-800/50 border border-gray-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-lg">👤</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{friend.name}</h3>
                      <span className="text-sm text-foreground-muted truncate max-w-[150px]">{friend.url}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(friend)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-green-500/20 transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(friend.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-foreground-muted text-sm mb-3">{friend.description}</p>
                <div className="flex flex-wrap gap-2">
                  {friend.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300"
                    >
                      {tag}
                    </span>
                  ))}
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
                  {editingFriend ? '编辑友链' : '添加友链'}
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
                    站点名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入站点名称"
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    站点网址
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
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
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    站点描述
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="输入站点描述"
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    标签 (逗号分隔)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="技术博客, 二次元"
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
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
                  disabled={!formData.name.trim() || !formData.url.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                  {editingFriend ? '保存' : '添加'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除友链"
        message="确定要删除这个友链吗？"
        confirmText="删除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={performDelete}
      />
    </div>
  );
}

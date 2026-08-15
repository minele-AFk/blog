'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  date: string;
  tags: string[];
  category: string;
  author: string;
  coverImage?: string;
  readTime: number;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    date: '',
    tags: '',
    category: '',
    author: '',
    coverImage: '',
  });
  const { token } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/posts');
      const data = await res.json();
      setPosts(data.data || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    try {
      const data = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      };

      if (editingPost) {
        await fetch(`/api/admin/posts/${editingPost.slug}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/admin/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
      }
      setShowModal(false);
      setEditingPost(null);
      setFormData({ title: '', slug: '', excerpt: '', content: '', date: '', tags: '', category: '', author: '', coverImage: '' });
      fetchPosts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (slug: string) => {
    setDeleteTarget(slug);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/admin/posts/${deleteTarget}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPosts();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      date: post.date,
      tags: post.tags.join(', '),
      category: post.category,
      author: post.author,
      coverImage: post.coverImage || '',
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      date: new Date().toISOString().split('T')[0],
      tags: '',
      category: '其他',
      author: '管理员',
      coverImage: '',
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">文章管理</h1>
          <p className="text-foreground-muted">管理您的博客文章</p>
        </div>
        <motion.button
          onClick={handleAdd}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          撰写文章
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"
          />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
          <p className="text-foreground-muted">暂无文章，点击上方按钮撰写第一篇文章</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6 rounded-xl bg-gray-800/50 border border-gray-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                    <p className="text-foreground-muted text-sm mb-3 line-clamp-2">{post.excerpt || post.content.substring(0, 100) + '...'}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-foreground-muted">{post.date}</span>
                      <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300">
                        {post.category}
                      </span>
                      <span className="text-foreground-muted">{post.readTime} 分钟阅读</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(post)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-orange-500/20 transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(post.slug)}
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
              className="w-full max-w-2xl p-6 rounded-xl bg-gray-800 border border-gray-700 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingPost ? '编辑文章' : '撰写文章'}
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
                    文章标题
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="输入文章标题"
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    文章路径 (slug)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="自动生成"
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    文章摘要
                  </label>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    placeholder="输入文章摘要"
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    文章内容 (支持 Markdown)
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="输入文章内容..."
                    rows={10}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                      日期
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                      分类
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="其他"
                      className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                      作者
                    </label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="管理员"
                      className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                      封面图片 URL
                    </label>
                    <input
                      type="url"
                      value={formData.coverImage}
                      onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                      placeholder="https://example.com/cover.jpg"
                      className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    标签 (逗号分隔)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="React, Next.js, 技术"
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
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
                  disabled={!formData.title.trim() || !formData.content.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                  {editingPost ? '保存' : '发布'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除文章"
        message="确定要删除这篇文章吗？"
        confirmText="删除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={performDelete}
      />
    </div>
  );
}

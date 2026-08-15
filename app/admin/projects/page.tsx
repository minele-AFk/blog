'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ImageUploader from '@/components/ImageUploader';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Project {
  id: string;
  name: string;
  description: string;
  tags: string[];
  date: string;
  github: string;
  demo: string;
  icon: string;
  cover?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: '',
    date: '',
    github: '',
    demo: '',
    icon: '✨',
    cover: '',
  });
  const { token } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/projects');
      const data = await res.json();
      setProjects(data.data || []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.description.trim()) return;

    try {
      const data = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      };

      if (editingProject) {
        await fetch(`/api/admin/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/admin/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
      }
      setShowModal(false);
      setEditingProject(null);
      setFormData({ name: '', description: '', tags: '', date: '', github: '', demo: '', icon: '✨', cover: '' });
      fetchProjects();
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
      await fetch(`/api/admin/projects/${deleteTarget}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProjects();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      tags: project.tags.join(', '),
      date: project.date,
      github: project.github,
      demo: project.demo,
      icon: project.icon,
      cover: project.cover || '',
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      tags: '',
      date: new Date().getFullYear().toString(),
      github: '',
      demo: '',
      icon: '✨',
      cover: '',
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">项目管理</h1>
          <p className="text-foreground-muted">管理您的项目展示</p>
        </div>
        <motion.button
          onClick={handleAdd}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          添加项目
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
          />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700">
          <p className="text-foreground-muted">暂无项目，点击上方按钮添加第一个项目</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {projects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-6 rounded-xl bg-gray-800/50 border border-gray-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{project.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{project.name}</h3>
                      <span className="text-sm text-foreground-muted">{project.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(project)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-blue-500/20 transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-foreground-muted text-sm mb-3">{project.description}</p>
                {project.cover && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img
                      src={project.cover}
                      alt={`${project.name} cover`}
                      loading="lazy"
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
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
              className="w-full max-w-lg p-6 rounded-xl bg-gray-800 border border-gray-700 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editingProject ? '编辑项目' : '添加项目'}
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
                    项目名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入项目名称"
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    项目描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="输入项目描述"
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
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
                    placeholder="React, TypeScript, Node.js"
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                      年份
                    </label>
                    <input
                      type="text"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      placeholder="2026"
                      className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                      图标
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="✨"
                      className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    项目封面
                  </label>
                  <ImageUploader
                    images={formData.cover ? [formData.cover] : []}
                    onChange={(images) => setFormData({ ...formData, cover: images[0] || '' })}
                    maxImages={1}
                    label="封面图片"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    GitHub 地址
                  </label>
                  <input
                    type="url"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-muted mb-2">
                    演示地址
                  </label>
                  <input
                    type="url"
                    value={formData.demo}
                    onChange={(e) => setFormData({ ...formData, demo: e.target.value })}
                    placeholder="https://demo.example.com"
                    className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
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
                  disabled={!formData.name.trim() || !formData.description.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                  {editingProject ? '保存' : '添加'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除项目"
        message="确定要删除这个项目吗？"
        confirmText="删除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={performDelete}
      />
    </div>
  );
}

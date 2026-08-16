'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Folder, GitBranch, ExternalLink, Tag, Calendar, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import EditModal from '@/components/EditModal';
import ImageUploader from '@/components/ImageUploader';
import ConfirmDialog from '@/components/ConfirmDialog';

// 兼容 HTML5 拖拽（onDrop）与 framer-motion 拖拽事件的公共结构
interface DragLikeEvent {
  preventDefault: () => void;
  dataTransfer?: DataTransfer | null;
}

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
  const { isAuthenticated, getToken } = useAuth();
  const [selectedTag, setSelectedTag] = useState('全部');
  const [isClient, setIsClient] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    tags: '', 
    github: '', 
    demo: '', 
    icon: '',
    cover: '' 
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/admin/projects');
      if (!res.ok) {
        // 非 200 时直接当成空数据（不抛错），避免客户端 .map 在非数组上报错
        setProjects([]);
        return;
      }
      const data = await res.json();
      // 兼容 { success, data: [...] } 与直接返回数组两种格式
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setProjects(list);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const allTags = projects.length > 0
    ? ['全部', ...new Set(projects.flatMap(p => p.tags))]
    : ['全部'];

  const filteredProjects = selectedTag === '全部'
    ? projects
    : projects.filter(p => p.tags.includes(selectedTag));

  const handleAddProject = () => {
    setEditingProject(null);
    setFormData({ name: '', description: '', tags: '', github: '', demo: '', icon: '📁', cover: '' });
    setShowModal(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setFormData({ 
      name: project.name, 
      description: project.description, 
      tags: project.tags.join(','), 
      github: project.github, 
      demo: project.demo, 
      icon: project.icon,
      cover: project.cover || '' 
    });
    setShowModal(true);
  };

  const handleDeleteProject = (id: string) => {
    setDeleteTarget(id);
  };

  const performDeleteProject = async () => {
    if (!deleteTarget) return;
    try {
      const token = getToken();
      await fetch('/api/admin/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: deleteTarget }),
      });
      fetchProjects();
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

    const newProjects = [...projects];
    const [draggedItem] = newProjects.splice(draggedIdx, 1);
    newProjects.splice(dropIndex, 0, draggedItem);

    setProjects(newProjects);
    setDraggedIndex(null);
    setDragOverIndex(null);

    try {
      const token = getToken();
      for (let i = 0; i < newProjects.length; i++) {
        await fetch('/api/admin/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id: newProjects[i].id, order: i }),
        });
      }
    } catch (e) {
      console.error(e);
      fetchProjects();
    }
  };

  const handleSave = async () => {
    setModalLoading(true);
    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      const token = getToken();
      
      if (editingProject) {
        await fetch('/api/admin/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id: editingProject.id, ...formData, tags }),
        });
      } else {
        await fetch('/api/admin/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ ...formData, tags }),
        });
      }
      
      setShowModal(false);
      fetchProjects();
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 page-header"
      >
        <div className="inline-flex items-center gap-3">
          <Folder className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">项目展示</h1>
        </div>
      </motion.div>

      {isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 flex justify-center"
        >
          <button
            onClick={handleAddProject}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"
          >
            <Plus className="w-5 h-5" />
            添加项目
          </button>
        </motion.div>
      )}

      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex flex-wrap justify-center gap-2 mb-8 category-bar"
      >
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              selectedTag === tag
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/5 text-foreground-muted hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          </button>
        ))}
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={isClient ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                whileHover={{ y: -4 }}
                className={`glass-card neon-border p-6 group relative cursor-move ${
                  draggedIndex === index ? 'opacity-50 scale-95' : ''
                } ${dragOverIndex === index ? 'ring-2 ring-purple-500' : ''}`}
                draggable={isAuthenticated}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{project.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-foreground-muted">
                        <Calendar className="w-4 h-4" />
                        {project.date}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAuthenticated && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProject(project);
                          }}
                          className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors z-10"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors z-10"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GitBranch className="w-5 h-5 text-foreground-muted hover:text-white" />
                      </a>
                    )}
                    {project.demo && (
                      <a
                        href={project.demo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-5 h-5 text-foreground-muted hover:text-white" />
                      </a>
                    )}
                  </div>
                </div>

                {project.cover && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img
                      src={project.cover}
                      alt={`${project.name} cover`}
                      loading="lazy"
                      className="w-full h-40 object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <p className="text-foreground-muted mb-4 leading-relaxed">
                  {project.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <motion.div
              initial={isClient ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-foreground-muted">暂无相关项目</p>
            </motion.div>
          )}
        </>
      )}

      <EditModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProject ? '编辑项目' : '添加项目'}
        onSubmit={handleSave}
        loading={modalLoading}
      >
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            项目名称
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="项目名称"
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-foreground-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            项目图标
          </label>
          <input
            type="text"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            placeholder="📁"
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-foreground-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
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
            描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="项目描述..."
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-foreground-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none"
            rows={3}
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
            placeholder="React, TypeScript, Next.js"
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-foreground-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            GitHub 链接
          </label>
          <input
            type="url"
            value={formData.github}
            onChange={(e) => setFormData({ ...formData, github: e.target.value })}
            placeholder="https://github.com/..."
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-foreground-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground-muted mb-2">
            演示链接
          </label>
          <input
            type="url"
            value={formData.demo}
            onChange={(e) => setFormData({ ...formData, demo: e.target.value })}
            placeholder="https://demo.example.com"
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-foreground-muted focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>
      </EditModal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除项目"
        message="确定要删除这个项目吗？"
        confirmText="删除"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={performDeleteProject}
      />
    </div>
  );
}
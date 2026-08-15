'use client';

import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { BlogPost, Category, Tag } from '../../lib/types';
import { Moment } from '../../lib/json-store';
import PostCard from '../../components/PostCard';
import Sidebar from '../../components/Sidebar';

interface BlogContentProps {
  posts: BlogPost[];
  categories: Category[];
  tags: Tag[];
  moments?: Moment[];
}

export default function BlogContent({ posts, categories, tags, moments }: BlogContentProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gradient">博客</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative mb-6"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
        <input
          type="text"
          placeholder="搜索文章..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-full bg-background-card border border-border text-foreground placeholder-foreground-muted focus:outline-none focus:border-primary transition-colors"
        />
      </motion.div>

      {filteredPosts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <p className="text-foreground-muted">没有找到相关文章</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
          {/* 文章列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPosts.map((post, index) => (
              <PostCard key={post.id} post={post} index={index} />
            ))}
          </div>

          {/* 侧边栏：分类 / 标签 / 最新动态 */}
          <aside className="hidden lg:block sticky top-24">
            <Sidebar categories={categories} tags={tags} moments={moments} />
          </aside>
        </div>
      )}
    </div>
  );
}

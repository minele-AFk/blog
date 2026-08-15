'use client';

import { motion } from 'framer-motion';
import { Folder, Hash, TrendingUp } from 'lucide-react';
import { Category, Tag } from '../lib/types';
import { Moment } from '../lib/json-store';

interface SidebarProps {
  categories: Category[];
  tags: Tag[];
  moments?: Moment[];  // 最新动态（说说），按日期取前若干条
}

export default function Sidebar({ categories, tags, moments = [] }: SidebarProps) {
  // 按日期倒序，取最新 5 条
  const latestMoments = [...moments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="glass-card p-6 mb-6">
        <h3 className="flex items-center gap-2 text-lg font-bold mb-4 text-primary">
          <Folder className="w-5 h-5" />
          分类
        </h3>
        <ul className="space-y-2">
          {categories.map((category) => (
            <motion.li
              key={category.id}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.2 }}
            >
              <a
                href={`/blog/category/${category.slug}`}
                className="flex items-center justify-between text-sm text-foreground-muted hover:text-primary transition-colors"
              >
                <span>{category.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary/20 text-secondary text-xs">
                  {category.count}
                </span>
              </a>
            </motion.li>
          ))}
        </ul>
      </div>

      <div className="glass-card p-6 mb-6">
        <h3 className="flex items-center gap-2 text-lg font-bold mb-4 text-secondary">
          <Hash className="w-5 h-5" />
          标签
        </h3>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <motion.a
              key={tag.name}
              href={`/blog/tag/${tag.name}`}
              whileHover={{ scale: 1.05 }}
              className="px-3 py-1 text-xs rounded-full bg-border-light hover:bg-primary/20 text-foreground-muted hover:text-primary transition-colors"
            >
              {tag.name} ({tag.count})
            </motion.a>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold mb-4 text-accent">
          <TrendingUp className="w-5 h-5" />
          最新动态
        </h3>
        <div className="space-y-3">
          {latestMoments.length > 0 ? (
            latestMoments.map((moment) => (
              <motion.div
                key={moment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-sm text-foreground-muted border-l-2 border-primary pl-3 py-1"
              >
                <p className="line-clamp-2">{moment.content}</p>
                <span className="text-xs text-foreground-muted/70">{moment.date}</span>
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-foreground-muted">暂无动态</p>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

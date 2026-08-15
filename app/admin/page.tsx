'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Folder, Link2, FileText, Sparkles, Heart, Star } from 'lucide-react';

interface Stats {
  moments: number;
  projects: number;
  friends: number;
  posts: number;
}

interface StatCardConfig {
  label: string;
  key: keyof Stats;
  icon: typeof MessageCircle;
  emoji: string;
  color: string;
  gradient: string;
  softBg: string;
  glow: string;
}

const statCards: StatCardConfig[] = [
  {
    label: '说说',
    key: 'moments',
    icon: MessageCircle,
    emoji: '💬',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #f9a8d4 100%)',
    softBg: 'rgba(255, 255, 255, 0.7)',
    glow: 'rgba(236, 72, 153, 0.25)',
  },
  {
    label: '项目',
    key: 'projects',
    icon: Folder,
    emoji: '📁',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 50%, #d8b4fe 100%)',
    softBg: 'rgba(255, 255, 255, 0.7)',
    glow: 'rgba(139, 92, 246, 0.25)',
  },
  {
    label: '友链',
    key: 'friends',
    icon: Link2,
    emoji: '🔗',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 50%, #a5f3fc 100%)',
    softBg: 'rgba(255, 255, 255, 0.7)',
    glow: 'rgba(6, 182, 212, 0.25)',
  },
  {
    label: '文章',
    key: 'posts',
    icon: FileText,
    emoji: '📝',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)',
    softBg: 'rgba(255, 255, 255, 0.7)',
    glow: 'rgba(249, 115, 22, 0.25)',
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ moments: 0, projects: 0, friends: 0, posts: 0 });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchStats = async () => {
      try {
        const [momentsRes, projectsRes, friendsRes, postsRes] = await Promise.all([
          fetch('/api/admin/moments'),
          fetch('/api/admin/projects'),
          fetch('/api/admin/friends'),
          fetch('/api/admin/posts'),
        ]);

        const [momentsData, projectsData, friendsData, postsData] = await Promise.all([
          momentsRes.json(),
          projectsRes.json(),
          friendsRes.json(),
          postsRes.json(),
        ]);

        setStats({
          moments: momentsData.data?.length || 0,
          projects: projectsData.data?.length || 0,
          friends: friendsData.data?.length || 0,
          posts: postsData.data?.length || 0,
        });
      } catch {
        setStats({ moments: 0, projects: 0, friends: 0, posts: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* 欢迎区域 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-pink-400" />
            <h1
              className="text-2xl font-bold"
              style={{
                background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              仪表盘
            </h1>
            <Sparkles className="w-5 h-5 text-pink-400" />
          </div>
          <p className="text-gray-400 text-sm ml-7">欢迎来到管理后台 ♡ 今天也要元气满满哦~</p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-sm"
          style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(74,222,128,0.3)' }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.6)', animation: 'pulse 2s infinite' }}
          />
          <span style={{ color: '#34d399' }}>系统运行正常</span>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={mounted ? { opacity: 1 } : {}}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + index * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="rounded-2xl p-5 shadow-lg cursor-default"
              style={{
                background: card.gradient,
                border: `2px solid rgba(255,255,255,0.6)`,
                boxShadow: `0 8px 32px ${card.glow}, 0 2px 8px rgba(0,0,0,0.06)`,
              }}
            >
              {/* 角标装饰 */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm"
                  style={{ background: 'rgba(255,255,255,0.7)' }}
                >
                  {card.emoji}
                </div>
                <Star className="w-4 h-4 opacity-30" style={{ color: card.color }} />
              </div>

              {/* 数值 */}
              <div className="text-3xl font-bold mb-1" style={{ color: '#1e293b' }}>
                {loading ? (
                  <span className="inline-block w-8 h-8 rounded-lg bg-white/60 animate-pulse" />
                ) : (
                  stats[card.key]
                )}
              </div>

              {/* 标签 */}
              <div className="text-sm font-medium" style={{ color: card.color }}>
                {card.label}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* 快速操作 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-base font-bold text-gray-500 mb-4 flex items-center gap-2 ml-1">
          <Heart className="w-4 h-4 text-pink-400" fill="currentColor" />
          快速操作
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              href: '/admin/moments',
              label: '发布说说',
              emoji: '💬',
              color: '#ec4899',
              gradient: 'linear-gradient(135deg, #fce7f3, #fdf2f8)',
              hoverGradient: 'linear-gradient(135deg, #fbcfe8, #fce7f3)',
            },
            {
              href: '/admin/projects',
              label: '添加项目',
              emoji: '📁',
              color: '#8b5cf6',
              gradient: 'linear-gradient(135deg, #f3e8ff, #faf5ff)',
              hoverGradient: 'linear-gradient(135deg, #e9d5ff, #f3e8ff)',
            },
            {
              href: '/admin/friends',
              label: '添加友链',
              emoji: '🔗',
              color: '#06b6d4',
              gradient: 'linear-gradient(135deg, #ecfeff, #f0f9ff)',
              hoverGradient: 'linear-gradient(135deg, #cffafe, #ecfeff)',
            },
            {
              href: '/admin/posts',
              label: '撰写文章',
              emoji: '📝',
              color: '#f97316',
              gradient: 'linear-gradient(135deg, #fff7ed, #fef3f2)',
              hoverGradient: 'linear-gradient(135deg, #ffedd5, #fff7ed)',
            },
          ].map((action) => (
            <motion.a
              key={action.href}
              href={action.href}
              whileHover={{ y: -4, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="relative rounded-2xl p-5 flex flex-col items-center gap-3 transition-all duration-300 shadow-md cursor-pointer group"
              style={{
                background: action.gradient,
                border: '2px solid rgba(255,255,255,0.7)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}
            >
              {/* 光晕 */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(circle at center, ${action.color}15, transparent 70%)` }}
              />

              <div className="text-3xl relative z-10" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>
                {action.emoji}
              </div>
              <span
                className="text-sm font-semibold relative z-10"
                style={{ color: action.color }}
              >
                {action.label}
              </span>
            </motion.a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

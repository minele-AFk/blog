'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, Send, Mail, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { BlogPost } from '../lib/types';
import { Moment } from '../lib/json-store';
import FloatingCharacter from '../components/FloatingCharacter';
import MusicPlayer from '../components/MusicPlayer';
import SystemStatus from '../components/SystemStatus';
import { useTheme } from '../contexts/ThemeContext';

interface HomeContentProps {
  recentPosts: BlogPost[];
  projectCount: number;
  momentCount: number;
  latestMoment: Moment | null;
}

export default function HomeContent({ recentPosts, projectCount, momentCount, latestMoment }: HomeContentProps) {
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BlogPost[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentLyric, setCurrentLyric] = useState('♪ 音乐加载中 ♪');
  const [displayedLyric, setDisplayedLyric] = useState('');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const lyricAnimationRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 歌词逐字现身动画 - 初始直接显示第一个字，避免空窗期
  useEffect(() => {
    if (lyricAnimationRef.current) {
      clearInterval(lyricAnimationRef.current);
    }
    
    if (currentLyric === displayedLyric) {
      return;
    }
    
    // 直接先显示第一个字
    if (currentLyric.length > 0) {
      setDisplayedLyric(currentLyric[0]);
    }
    let index = 1;
    
    lyricAnimationRef.current = setInterval(() => {
      if (index < currentLyric.length) {
        setDisplayedLyric(currentLyric.slice(0, index + 1));
        index++;
      } else {
        if (lyricAnimationRef.current) {
          clearInterval(lyricAnimationRef.current);
        }
      }
    }, 80);

    return () => {
      if (lyricAnimationRef.current) {
        clearInterval(lyricAnimationRef.current);
      }
    };
  }, [currentLyric]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data);
          setShowSearchResults(true);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchFocus = () => {
    if (searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  const stats = [
    { label: '项目', value: projectCount, color: 'text-primary', href: '/projects' },
    { label: '说说', value: momentCount, color: 'text-secondary', href: '/moments' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 搜索框 - 放在个人信息和音乐播放器上方 */}
      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="my-6"
        ref={searchContainerRef}
      >
        <div 
          className="relative rounded-xl overflow-hidden search-bar"
          style={{
            background: 'rgba(20, 20, 35, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
          }}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="搜索标题、描述或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleSearchFocus}
            className="w-full pl-12 pr-12 py-3 bg-transparent text-foreground placeholder-foreground-muted focus:outline-none"
          />
          {searchQuery && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-foreground-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        <AnimatePresence>
          {showSearchResults && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 glass-card neon-border overflow-hidden"
              style={{ maxHeight: '400px', overflowY: 'auto' }}
            >
              {isSearching ? (
                <div className="p-8 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full mx-auto"
                  />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-foreground-muted">没有找到相关内容</p>
                </div>
              ) : (
                <div className="p-2">
                  {searchResults.slice(0, 8).map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 4 }}
                    >
                      <Link
                        href={`/blog/${post.slug}`}
                        onClick={() => {
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Search className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium truncate group-hover:text-purple-400 transition-colors">
                            {post.title}
                          </h4>
                          <p className="text-sm text-foreground-muted truncate">
                            {post.excerpt || '暂无摘要'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                              {post.category}
                            </span>
                            {post.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-xs px-2 py-0.5 rounded bg-white/5 text-foreground-muted">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-foreground-muted group-hover:text-purple-400 transition-colors flex-shrink-0" />
                      </Link>
                    </motion.div>
                  ))}
                  {searchResults.length > 8 && (
                    <Link
                      href="/blog"
                      onClick={() => {
                        setShowSearchResults(false);
                        setSearchQuery('');
                      }}
                      className="block p-4 text-center text-sm text-foreground-muted hover:text-purple-400 transition-colors"
                    >
                      查看全部 {searchResults.length} 篇文章 →
                    </Link>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 个人信息卡片 + 音乐播放器 - 并排显示 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* 个人信息卡片 */}
        <motion.div
          initial={isClient ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          className="glass-card neon-border p-6 cursor-pointer h-full group"
        >
          <div className="flex items-center gap-4 mb-4">
            <Link href="/about" className="relative w-20 h-20 flex-shrink-0">
              <div 
                className="w-full h-full rounded-full overflow-hidden glow-purple"
                style={{
                  border: '3px solid rgba(168, 85, 247, 0.5)',
                }}
              >
                <img
                  src="/763e1704988fb73ab9fcb11f80253667.jpg"
                  alt="戏子多秋"
                  className="w-full h-full object-cover"
                />
              </div>
            </Link>
            <div>
              <Link href="/about">
                <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                  戏子多秋
                </h2>
              </Link>
              <Link href="/about" className="block">
                <p className="text-foreground-muted text-sm leading-relaxed group-hover:text-primary transition-colors">
                  コードと学術と分子動力学シミュレーションの間を行き来する普通人。最近はGROMACSシミュレーション研究とニューラルネットワーク計算に没頭している。
                </p>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-6 mb-4">
            {stats.map((stat) => (
              <Link key={stat.label} href={stat.href} className="text-center group/stat">
                <span className={`block text-2xl font-bold ${stat.color} group-hover/stat:text-primary transition-colors`}>{stat.value}</span>
                <span className="text-xs text-foreground-muted group-hover/stat:text-primary transition-colors">{stat.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <motion.a
              href="https://github.com/minele-AFk"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub: minele-AFk"
              whileHover={{ scale: 1.1, y: -2 }}
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-white/10 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </motion.a>
            <motion.div
              whileHover={{ scale: 1.1, y: -2 }}
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-white/10 transition-colors"
            >
              <Send className="w-4 h-4" />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.1, y: -2 }}
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-white/10 transition-colors"
            >
              <Mail className="w-4 h-4" />
            </motion.div>
          </div>
        </motion.div>

        {/* 音乐播放器 */}
        <motion.div
          initial={isClient ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="h-auto"
        >
          <MusicPlayer onLyricChange={setCurrentLyric} onPlayingChange={setIsMusicPlaying} />
        </motion.div>
      </div>

      {/* 实时歌词横条 */}
      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card neon-border px-6 py-4 mb-6"
      >
        <div className="flex items-center gap-4">
          {/* 音量波浪 */}
          <div className="flex items-center gap-0.5">
            {[0, 1, 2, 3, 4].map((bar) => (
              <motion.div
                key={bar}
                className="w-1 rounded-full bg-purple-400"
                animate={isMusicPlaying ? {
                  height: [4, 12, 6, 16, 4],
                } : {
                  height: 4,
                }}
                transition={isMusicPlaying ? {
                  duration: 0.8,
                  repeat: Infinity,
                  delay: bar * 0.1,
                  ease: "easeInOut",
                } : {
                  duration: 0.3,
                }}
              />
            ))}
          </div>

          {/* 歌词 */}
          <p className="flex-1 text-base text-white text-center truncate font-medium">
            {displayedLyric || '♪'}
          </p>

          {/* 音乐符号 */}
          <motion.span
            animate={isMusicPlaying ? {
              y: [0, -6, 0],
            } : {
              y: 0,
            }}
            transition={isMusicPlaying ? {
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
            } : {
              duration: 0.3,
            }}
            className="text-purple-400 text-lg"
          >
            ♫
          </motion.span>
        </div>
      </motion.div>

      {/* 内容卡片区域 */}
      <div className="space-y-6">
        {/* 最新文章卡片 */}
        {recentPosts[0] && (
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -2 }}
            className="glass-card neon-border overflow-hidden cursor-pointer group"
          >
            <Link href={`/blog/${recentPosts[0].slug}`} className="block">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-primary text-sm font-medium">Latest Insight</span>
                  <span className="text-sm text-foreground-muted">{recentPosts[0].date}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                  {recentPosts[0].title}
                </h3>
                <p className="text-foreground-muted text-sm mb-4">{recentPosts[0].excerpt}</p>
                <div className="flex items-center gap-2">
                  {recentPosts[0].tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-1 text-xs rounded bg-secondary/20 text-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* 开发记录卡片 - 展示最新说说（动态数据） */}
        {latestMoment && (
          <motion.div
            initial={isClient ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ y: -2 }}
            className="glass-card neon-border overflow-hidden cursor-pointer group"
          >
            <Link href="/moments" className="block">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-secondary text-sm font-medium">Records</span>
                  <span className="text-sm text-foreground-muted">{latestMoment.date}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{latestMoment.content}</h3>
                <span className="text-foreground-muted text-sm group-hover:text-primary transition-colors">
                  查看全部说说 →
                </span>
              </div>
            </Link>
          </motion.div>
        )}

        {/* 更多文章列表 */}
        {recentPosts.length > 1 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-primary" />
                更多文章
              </h2>
              <Link href="/blog" className="text-sm text-foreground-muted hover:text-primary transition-colors">
                查看全部 →
              </Link>
            </div>
            <div className="space-y-4">
              {recentPosts.slice(1).map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={isClient ? { opacity: 0, y: 20 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ y: -2 }}
                  className="glass-card neon-border p-4 cursor-pointer group"
                >
                  <Link href={`/blog/${post.slug}`} className="block">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors mb-1">
                          {post.title}
                        </h3>
                        <p className="text-foreground-muted text-sm line-clamp-1">{post.excerpt}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="text-xs text-foreground-muted">{post.date}</span>
                        <span className="px-2 py-1 text-xs rounded bg-primary/20 text-primary">{post.category}</span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 主题切换卡片 */}
        <motion.div
          initial={isClient ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={toggleTheme}
          className="glass-card neon-border p-5 cursor-pointer group h-full"
          whileHover={{ scale: 1.02 }}
        >
          <div className="relative z-10 flex items-center gap-4 h-full">
            {/* 图标 */}
            <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                theme === 'night' 
                  ? 'bg-gradient-to-br from-indigo-900/80 to-purple-900/60 border-purple-500/30' 
                  : 'bg-gradient-to-br from-rose-500/40 to-amber-400/30 border-rose-500/20'
              }`}>
              <AnimatePresence mode="wait">
                {theme === 'night' ? (
                  <motion.div
                    key="moon"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l1.66 5L19 9.34l-5 1.66L12 17l-1.66-5L5 9.34l5-1.66L12 2z" fill="#FFD700"/>
                      <path d="M8 7l1 3h4l1-3" fill="#FFD700"/>
                      <path d="M15 11l2 3" stroke="#FFD700" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="5" fill="#E8967A"/>
                      <path d="M12 2v2" stroke="#E8967A" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M12 20v2" stroke="#E8967A" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M2 12h2" stroke="#E8967A" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M20 12h2" stroke="#E8967A" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M4.93 4.93l1.41 1.41" stroke="#E8967A" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M17.66 17.66l1.41 1.41" stroke="#E8967A" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M4.93 19.07l1.41-1.41" stroke="#E8967A" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M17.66 6.34l1.41-1.41" stroke="#E8967A" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 文字 */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white">
                {theme === 'night' ? '夜间模式' : '日间模式'}
              </h3>
              <p className="text-sm text-foreground-muted mt-0.5">
                {theme === 'night' ? '流萤飞舞的深空' : '阳光明媚的早晨'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* 系统状态 */}
        <SystemStatus />
      </div>

      <FloatingCharacter />
    </div>
  );
}

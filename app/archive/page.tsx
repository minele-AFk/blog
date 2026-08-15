'use client';

import { motion } from 'framer-motion';
import { Archive, Calendar, Tag, Folder, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface Post {
  id: number;
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
}

const getMonthYear = (dateStr: string) => {
  const date = new Date(dateStr);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    monthName: date.toLocaleDateString('zh-CN', { month: 'long' }),
  };
};

const groupByYearMonth = (postsList: Post[]) => {
  const groups: Record<string, Record<string, Post[]>> = {};
  
  postsList.forEach((post) => {
    const { year, month } = getMonthYear(post.date);
    const yearKey = `${year}`;
    const monthKey = `${month}`;
    
    if (!groups[yearKey]) groups[yearKey] = {};
    if (!groups[yearKey][monthKey]) groups[yearKey][monthKey] = [];
    groups[yearKey][monthKey].push(post);
  });
  
  return groups;
};

export default function ArchivePage() {
  const { isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [isClient, setIsClient] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<string[]>(['全部']);

  useEffect(() => {
    setIsClient(true);
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/admin/posts');
      const data = await res.json();
      const postData = data.data || [];
      setPosts(postData);
      const cats = ['全部', ...new Set((postData as Post[]).map(p => p.category))] as string[];
      setCategories(cats);
    } catch {
      setPosts([]);
    }
  };

  const filteredPosts = selectedCategory === '全部'
    ? posts
    : posts.filter(p => p.category === selectedCategory);

  const groupedPosts = groupByYearMonth(filteredPosts);

  const toggleYear = (year: string) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const getMonthPostCount = (year: string, month: string) => {
    return groupedPosts[year]?.[month]?.length || 0;
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
          <Archive className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">文章归档</h1>
        </div>
      </motion.div>

      {isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 flex justify-center"
        >
          <Link
            href="/admin/posts"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"
          >
            <Plus className="w-5 h-5" />
            写文章
          </Link>
        </motion.div>
      )}

      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex flex-wrap justify-center gap-2 mb-8 category-bar"
      >
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              selectedCategory === category
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/5 text-foreground-muted hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1">
              <Folder className="w-3 h-3" />
              {category}
            </span>
          </button>
        ))}
      </motion.div>

      <motion.div
        initial={isClient ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="glass-card neon-border p-6"
      >
        <div className="space-y-4">
          {Object.keys(groupedPosts).sort((a, b) => parseInt(b) - parseInt(a)).map((year) => (
            <div key={year} className="border-b border-white/10 last:border-0">
              <button
                onClick={() => toggleYear(year)}
                className="w-full flex items-center justify-between py-4 hover:bg-white/5 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: expandedYears.has(year) ? 90 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-purple-400"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </motion.div>
                  <span className="text-xl font-bold text-white">{year}年</span>
                  <span className="text-sm text-foreground-muted">
                    ({Object.values(groupedPosts[year]).flat().length} 篇)
                  </span>
                </div>
              </button>

              {expandedYears.has(year) && (
                <div className="ml-8 space-y-2">
                  {Object.keys(groupedPosts[year]).sort((a, b) => parseInt(b) - parseInt(a)).map((month) => {
                    const monthData = groupedPosts[year][month][0];
                    const monthName = monthData ? getMonthYear(monthData.date).monthName : '';
                    const monthKey = `${year}-${month}`;
                    const isExpanded = expandedMonths.has(monthKey);

                    return (
                      <div key={month} className="border-l-2 border-purple-500/30 pl-4">
                        <button
                          onClick={() => toggleMonth(monthKey)}
                          className="w-full flex items-center justify-between py-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: isExpanded ? 90 : 0 }}
                              transition={{ duration: 0.3 }}
                              className="text-purple-400"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </motion.div>
                            <span className="text-white">{monthName}</span>
                            <span className="text-sm text-foreground-muted">
                              ({getMonthPostCount(year, month)} 篇)
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="ml-6 space-y-2"
                          >
                            {groupedPosts[year][month].map((post) => (
                              <Link
                                key={post.id}
                                href={`/blog/${post.slug}`}
                                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                              >
                                <div className="flex items-center gap-3">
                                  <Calendar className="w-4 h-4 text-foreground-muted" />
                                  <span className="text-sm text-foreground-muted">{post.date}</span>
                                  <span className="text-white group-hover:text-purple-400 transition-colors">
                                    {post.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300">
                                    {post.category}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {Object.keys(groupedPosts).length === 0 && (
          <div className="text-center py-12">
            <p className="text-foreground-muted">暂无文章</p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={isClient ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-8 glass-card neon-border p-6"
      >
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-purple-400" />
          标签统计
        </h3>
        <div className="flex flex-wrap gap-2">
          {posts.length > 0 ? (
            [...new Set(posts.flatMap(p => p.tags))].map((tag) => {
              const count = posts.filter(p => p.tags.includes(tag)).length;
              return (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30"
                >
                  {tag} ({count})
                </span>
              );
            })
          ) : (
            <p className="text-foreground-muted w-full text-center">暂无标签</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

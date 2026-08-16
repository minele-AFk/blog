'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, Clock } from 'lucide-react';
import { Anime, AnimeStatus } from '@/lib/types';
import AnimeCard from '@/components/AnimeCard';
import { useTheme } from '@/contexts/ThemeContext';

const STATUS_TABS: { key: AnimeStatus; label: string }[] = [
  { key: 'watching', label: '在看' },
  { key: 'plan_to_watch', label: '想看' },
  { key: 'on_hold', label: '搁置' },
  { key: 'completed', label: '看过' },
  { key: 'dropped', label: '抛弃' },
];

// 格式化时间戳
function formatTime(ts: number | null): string {
  if (!ts) return '从未同步';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function AnimePage() {
  const { theme } = useTheme();
  const isDayMode = theme === 'day';
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  // 初始化 tab：优先从 URL 查询参数读取，进入详情页返回后仍保持原分类
  const [activeTab, setActiveTab] = useState<AnimeStatus>(() => {
    if (typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab && STATUS_TABS.some((s) => s.key === tab)) {
        return tab as AnimeStatus;
      }
    }
    return 'watching';
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const [configReady, setConfigReady] = useState(true);

  // 检查管理员状态
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    setIsAdmin(!!token);
  }, []);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/anime');
      const result = await res.json();
      if (result.success) {
        // 防御：确保 data 是数组，避免异常数据导致渲染崩溃白屏
        setAnimeList(Array.isArray(result.data) ? result.data : []);
        setLastSync(result.meta?.lastSync || null);
        setConfigReady(result.meta?.configReady ?? true);

        // 过期时只提示管理员可手动同步，不阻塞页面渲染、不在前端触发拉取
        // 同步逻辑只在 /api/anime/sync（管理员手动）或 cron 中执行
        if (result.meta?.expired) {
          setBackgroundSyncing(false);
        }
      } else {
        setError(result.error || '加载失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  // 轮询直到同步完成
  const pollUntilSyncComplete = () => {
    let attempts = 0;
    const maxAttempts = 120; // 最多等待 120 秒
    
    const poll = async () => {
      attempts++;
      
      try {
        const res = await fetch('/api/anime');
        const result = await res.json();
        
        if (result.success) {
          setAnimeList(Array.isArray(result.data) ? result.data : []);
          setLastSync(result.meta?.lastSync || null);
          setConfigReady(result.meta?.configReady ?? true);
          
          // 同步完成或超时
          if (!result.meta?.syncing || attempts >= maxAttempts) {
            setBackgroundSyncing(false);
            return;
          }
        }
        
        // 继续轮询
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setBackgroundSyncing(false);
        }
      } catch {
        setBackgroundSyncing(false);
      }
    };
    
    // 1 秒后开始第一次轮询
    setTimeout(poll, 1000);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 返回列表时恢复进入详情页前的滚动位置（位置由 AnimeCard 点击时写入 sessionStorage）
  const scrollRestored = useRef(false);
  useEffect(() => {
    if (loading || animeList.length === 0 || scrollRestored.current) return;
    scrollRestored.current = true;
    const saved = sessionStorage.getItem('anime_scroll_pos');
    if (saved) {
      const pos = parseInt(saved, 10);
      if (!isNaN(pos)) {
        // 等列表渲染完成后再滚动，否则高度未撑开会滚不到位
        requestAnimationFrame(() => window.scrollTo(0, pos));
      }
      sessionStorage.removeItem('anime_scroll_pos');
    }
  }, [loading, animeList]);

  // 同步数据
  const handleSync = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/anime/sync', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setAnimeList(data.data);
        // 重新获取 meta 信息
        const metaRes = await fetch('/api/anime');
        const metaData = await metaRes.json();
        if (metaData.success) {
          setLastSync(metaData.meta?.lastSync || null);
          setConfigReady(metaData.meta?.configReady ?? true);
        }
      } else {
        setError(data.error || '同步失败');
      }
    } catch {
      setError('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  // 切换分类：更新状态并同步到 URL 查询参数，保证返回/刷新时保持
  const handleTabChange = (key: AnimeStatus) => {
    setActiveTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.replaceState(null, '', url.toString());
  };

  // 过滤数据
  const filteredList = animeList.filter((anime) => anime.status === activeTab);

  // 统计
  const counts: Record<AnimeStatus, number> = {
    watching: animeList.filter((a) => a.status === 'watching').length,
    completed: animeList.filter((a) => a.status === 'completed').length,
    plan_to_watch: animeList.filter((a) => a.status === 'plan_to_watch').length,
    on_hold: animeList.filter((a) => a.status === 'on_hold').length,
    dropped: animeList.filter((a) => a.status === 'dropped').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSync}
              disabled={syncing || backgroundSyncing}
              title="点击同步追番数据"
              className={`text-2xl font-bold px-4 py-2 rounded-xl backdrop-blur-md border flex items-center gap-2 shadow-sm cursor-pointer disabled:cursor-default disabled:opacity-80 ${
                isDayMode
                  ? 'bg-white/80 border-white/60 text-slate-800'
                  : 'bg-white/60 dark:bg-white/10 border-white/40 dark:border-white/10 text-slate-800 dark:text-white'
              }`}
            >
              🌸 追番记录
              {(syncing || backgroundSyncing) && (
                <Loader2 className="w-5 h-5 animate-spin text-purple-500 dark:text-purple-300" />
              )}
            </motion.button>
          ) : (
            <h1 className={`text-2xl font-bold px-4 py-2 rounded-xl backdrop-blur-md border flex items-center gap-2 shadow-sm ${
              isDayMode
                ? 'bg-white/80 border-white/60 text-slate-800'
                : 'bg-white/60 dark:bg-white/10 border-white/40 dark:border-white/10 text-slate-800 dark:text-white'
            }`}>
              🌸 追番记录
            </h1>
          )}
          {isAdmin && backgroundSyncing && (
            <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-300 bg-purple-500/10 px-2 py-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              同步中，请稍候...
            </span>
          )}
        </div>
      </div>

      {/* 首次同步提示 */}
      {isAdmin && animeList.length === 0 && !loading && !error && (
        <div className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm">
          <p className="font-medium mb-1">👋 欢迎来到追番页面！</p>
          <p>当前还没有追番数据，点击上方「🌸 追番记录」标题即可从 Bangumi 同步获取你的追番记录。</p>
          <p className="text-xs mt-2 opacity-70">同步速度已优化，通常几秒内即可完成，请耐心等待。</p>
        </div>
      )}

      {/* 上次同步时间 - 仅管理员可见 */}
      {isAdmin && (
        <div className="mb-4 flex items-center gap-2 text-sm text-foreground-muted">
          <Clock className="w-4 h-4" />
          <span>上次同步: {formatTime(lastSync)}</span>
          <span className="text-xs opacity-60">
            {lastSync && Date.now() - lastSync > 24 * 60 * 60 * 1000
              ? '(已超过 24 小时，访问页面时自动更新)'
              : '(缓存 24 小时，过期自动更新)'}
          </span>
        </div>
      )}

      {/* 未配置 BANGUMI_TOKEN 提示 - 仅管理员可见 */}
      {isAdmin && !configReady && (
        <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm">
          <p className="font-medium mb-1">⚠️ 追番同步尚未配置</p>
          <p>需要在服务器环境变量中设置 <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">BANGUMI_TOKEN</code>（Bangumi API Token），同步才能生效。</p>
          <p className="text-xs mt-2 opacity-80">配置方法：在项目根目录创建 <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">.env</code> 文件，参考 <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">.env.example</code>，填写后重启服务。</p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-300">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* 标签页 */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25 dark:shadow-purple-500/15'
                : isDayMode
                  ? 'bg-black/10 text-slate-800 hover:bg-black/15 border border-black/10'
                  : 'bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200 hover:bg-black/10 dark:hover:bg-white/20 border border-black/5 dark:border-white/5'
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'opacity-80' : 'opacity-50'}`}>({counts[tab.key]})</span>
            )}
          </button>
        ))}
      </div>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
            <p className="text-foreground-muted mt-3">加载中...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-foreground-muted">
              {animeList.length === 0 ? '暂无数据，点击标题同步获取番剧数据' : '该分类暂无番剧记录'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredList.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        )}
    </div>
  );
}

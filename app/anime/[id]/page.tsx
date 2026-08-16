'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Star, Calendar, Film, Loader2, AlertCircle,
  Tag, ExternalLink, Users,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface AnimeDetail {
  id: string;
  name: string;
  nameOriginal: string;
  cover: string;
  synopsis: string;
  tags: string[];
  airDate: string;
  rank: number;
  ratingScore: number;
  votes: number;
  votesCount: number[];
  infobox: Record<string, string>;
  totalEpisodes: number;
  status?: string;
}

export default function AnimeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const isDayMode = theme === 'day';
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    // 单次请求：详情 API 内部已合并列表状态
    setLoading(true);
    setError('');
    fetch(`/api/anime/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) {
          setDetail(data.data);
        } else {
          setError(data.error || '加载失败');
        }
      })
      .catch(() => {
        if (!cancelled) setError('网络错误');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const name = detail?.name || '';
  const cover = detail?.cover || '';
  const synopsis = detail?.synopsis || '';
  const tags = detail?.tags || [];
  const maxVote = detail ? Math.max(...detail.votesCount, 1) : 1;

  // 过滤掉不重要的 infobox 字段
  const importantInfoKeys = ['话数', '放送开始', '放送星期', '官方网站', '原作', '导演', '音乐', '制作'];
  const importantInfo = detail
    ? Object.entries(detail.infobox).filter(([k]) => importantInfoKeys.includes(k))
    : [];
  const otherInfo = detail
    ? Object.entries(detail.infobox).filter(([k]) => !importantInfoKeys.includes(k) && !['别名', '中文名', '日文名'].includes(k)).slice(0, 10)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        <span className="ml-3 text-foreground-muted">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-red-400 mb-2">{error}</p>
        <button
          onClick={() => router.push('/anime')}
          className="mt-4 px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground transition-colors"
        >
          返回追番列表
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      {/* 返回按钮 */}
      <button
        onClick={() => router.back()}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors mb-6 ${
          isDayMode
            ? 'bg-white/80 border-gray-200 text-gray-700 hover:bg-white hover:border-gray-300 hover:text-gray-900'
            : 'bg-white/5 border-white/10 text-foreground-muted hover:bg-white/10 hover:text-foreground hover:border-white/20'
        }`}
      >
        <ArrowLeft className="w-5 h-5" />
        返回追番列表
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card rounded-2xl p-6 md:p-8"
      >
        {/* 头部：左封面右信息 */}
        <div className="flex flex-col sm:flex-row gap-6">
          {/* 封面（中等大小） */}
          <div className="shrink-0 w-44 sm:w-48 mx-auto sm:mx-0">
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-black/30">
              <img
                src={cover ? `/api/anime/cover?url=${encodeURIComponent(cover)}` : ''}
                alt={name}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = '1';
                    img.src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><rect fill="%231a1a2e" width="300" height="400"/><text x="150" y="200" fill="%23666" font-size="14" text-anchor="middle">封面加载失败</text></svg>')}`;
                  }
                }}
              />
            </div>
          </div>

          {/* 基本信息 */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{name}</h1>
            {detail?.nameOriginal && detail.nameOriginal !== name && (
              <p className="text-foreground-muted text-sm mb-4">{detail.nameOriginal}</p>
            )}

            {/* 评分/排名/状态 */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              {detail && detail.ratingScore > 0 && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${isDayMode ? 'bg-yellow-500/10 border-yellow-600/30 text-yellow-700' : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300'}`}>
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold text-lg">{detail.ratingScore.toFixed(1)}</span>
                </div>
              )}
              {detail && detail.rank > 0 && (
                <div className={`px-3 py-1.5 rounded-lg border text-sm ${isDayMode ? 'bg-purple-500/10 border-purple-600/30 text-purple-700' : 'bg-purple-500/15 border-purple-500/30 text-purple-300'}`}>
                  #{detail.rank}
                </div>
              )}
              {detail?.status && (
                <div className={`px-3 py-1.5 rounded-lg border text-sm ${isDayMode ? 'bg-blue-500/10 border-blue-600/30 text-blue-700' : 'bg-blue-500/15 border-blue-500/30 text-blue-300'}`}>
                  {{
                    watching: '在看', completed: '已看', plan_to_watch: '想看',
                    on_hold: '搁置', dropped: '抛弃',
                  }[detail.status]}
                </div>
              )}
            </div>

            {/* 元信息 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {detail?.airDate && (
                <div className="flex items-center gap-2.5">
                  <Calendar className={`w-4 h-4 shrink-0 ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`} />
                  <div>
                    <p className="text-xs text-foreground-muted">放送日期</p>
                    <p className="text-sm text-foreground">{detail.airDate}</p>
                  </div>
                </div>
              )}
              {detail && detail.totalEpisodes > 0 && (
                <div className="flex items-center gap-2.5">
                  <Film className={`w-4 h-4 shrink-0 ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`} />
                  <div>
                    <p className="text-xs text-foreground-muted">总集数</p>
                    <p className="text-sm text-foreground">{detail.totalEpisodes} 话</p>
                  </div>
                </div>
              )}
              {detail && detail.votes > 0 && (
                <div className="flex items-center gap-2.5">
                  <Users className={`w-4 h-4 shrink-0 ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`} />
                  <div>
                    <p className="text-xs text-foreground-muted">评分人数</p>
                    <p className="text-sm text-foreground">{detail.votes}</p>
                  </div>
                </div>
              )}
              {detail && (
                <div className="flex items-center gap-2.5">
                  <ExternalLink className={`w-4 h-4 shrink-0 ${isDayMode ? 'text-purple-600' : 'text-purple-400'}`} />
                  <div>
                    <p className="text-xs text-foreground-muted">Bangumi</p>
                    <a
                      href={`https://bgm.tv/subject/${detail.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      查看原页
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* 标签 */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-3 py-1 rounded-full text-xs border ${isDayMode ? 'bg-purple-500/10 text-purple-700 border-purple-600/20' : 'bg-purple-500/15 text-purple-300 border-purple-500/20'}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 评分分布 */}
        {detail && detail.votes > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-foreground-muted mb-3">评分分布</h3>
            <div className="flex items-end gap-1 h-24 max-w-xl">
              {detail.votesCount.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-foreground-muted">{count || ''}</span>
                  <div className="w-full bg-foreground/5 rounded-t flex items-end" style={{ height: '56px' }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(count / maxVote) * 100}%` }}
                      transition={{ delay: i * 0.04, duration: 0.4 }}
                      className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t"
                      style={{ minHeight: count > 0 ? '4px' : '0' }}
                    />
                  </div>
                  <span className="text-[10px] text-foreground-muted">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 详细信息 Infobox */}
        {(importantInfo.length > 0 || otherInfo.length > 0) && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-foreground-muted mb-3">详细信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {importantInfo.map(([key, value]) => (
                <div key={key} className="flex gap-2 text-sm py-2 px-3 rounded-lg bg-foreground/5">
                  <span className="text-foreground-muted whitespace-nowrap">{key}:</span>
                  <span className="text-foreground">{value}</span>
                </div>
              ))}
              {otherInfo.map(([key, value]) => (
                <div key={key} className="flex gap-2 text-sm py-2 px-3 rounded-lg bg-foreground/5">
                  <span className="text-foreground-muted whitespace-nowrap">{key}:</span>
                  <span className="text-foreground line-clamp-2">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 剧情简介 */}
        {synopsis && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-foreground-muted mb-3">剧情简介</h3>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {synopsis}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

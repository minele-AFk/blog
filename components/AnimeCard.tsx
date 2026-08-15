'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Anime } from '@/lib/types';
import { useTheme } from '@/contexts/ThemeContext';

interface AnimeCardProps {
  anime: Anime;
}

const STATUS_LABELS: Record<Anime['status'], string> = {
  watching: '在看',
  completed: '已看',
  plan_to_watch: '想看',
  on_hold: '搁置',
  dropped: '抛弃',
};

const STATUS_COLORS: Record<Anime['status'], string> = {
  watching: 'bg-green-500/20 text-green-300 border-green-500/30',
  completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  plan_to_watch: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  on_hold: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  dropped: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export default function AnimeCard({ anime }: AnimeCardProps) {
  const { theme } = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-sm transition-all hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer"
    >
      {/* 整卡链接到详情页 */}
      <Link href={`/anime/${anime.id}`} className="block">
        {/* 封面 */}
        <div className="relative aspect-[3/4] overflow-hidden bg-white/5">
          <img
            src={`/api/anime/cover?url=${encodeURIComponent(anime.cover)}`}
            alt={anime.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.fallback) {
                img.dataset.fallback = '1';
                img.src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><rect fill="%231a1a2e" width="300" height="400"/><text x="150" y="200" fill="%23666" font-size="14" text-anchor="middle">封面加载失败</text></svg>')}`;
              }
            }}
          />
          {/* 状态标签（右上角） */}
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border shadow-md ${STATUS_COLORS[anime.status]}`}>
              {STATUS_LABELS[anime.status]}
            </span>
          </div>
        </div>

        {/* 信息 */}
        <div className={`p-3 ${
          theme === 'day'
            ? 'bg-gradient-to-t from-black/90 via-black/70 to-transparent'
            : 'bg-gradient-to-t from-black/80 via-black/50 to-transparent'
        }`}>
          <h3
            className="font-medium text-sm truncate drop-shadow-lg"
            style={{ color: '#ffffff' }}
            title={anime.name}
          >{anime.name}</h3>
        </div>
      </Link>
    </motion.div>
  );
}

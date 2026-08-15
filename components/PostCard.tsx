'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, Tag } from 'lucide-react';
import { BlogPost } from '../lib/types';

interface PostCardProps {
  post: BlogPost;
  index: number;
}

export default function PostCard({ post, index }: PostCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="glass-card neon-border overflow-hidden cursor-pointer group"
    >
      <div className="relative h-32 overflow-hidden">
        <img
          src={post.coverImage || '/cover-placeholder.svg'}
          alt={post.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/80 text-white">
            {post.category}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
        
        <p className="text-foreground-muted text-sm mb-3 line-clamp-2">
          {post.excerpt}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-foreground-muted">
              <Clock className="w-3 h-3" />
              {post.readTime}min
            </div>
            <span className="text-xs text-foreground-muted">{post.date}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {post.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-0.5 text-xs text-secondary"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

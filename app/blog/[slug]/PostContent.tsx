'use client';

import { motion } from 'framer-motion';
import { Clock, Tag, ArrowLeft, Share2 } from 'lucide-react';
import Link from 'next/link';
import { BlogPost } from '../../../lib/types';

interface PostContentProps {
  post: BlogPost;
  contentHtml: string;
}

export default function PostContent({ post, contentHtml }: PostContentProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link
          href="/blog"
          className="flex items-center gap-2 text-foreground-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回博客
        </Link>
      </motion.div>

      <motion.article
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card p-8 md:p-12"
      >
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-medium">
            {post.category}
          </span>
          <div className="flex items-center gap-4 text-foreground-muted text-sm">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readTime} min
            </span>
            <span>{post.date}</span>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-6">{post.title}</h1>

        <p className="text-xl text-foreground-muted mb-8">{post.excerpt}</p>

        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-border-light">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-anime flex items-center justify-center">
              <span className="text-white font-bold">{post.author[0]}</span>
            </div>
            <span className="font-medium">{post.author}</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-background-secondary border border-border text-foreground-muted hover:text-primary hover:border-primary transition-colors">
            <Share2 className="w-4 h-4" />
            分享
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {post.tags.map((tag) => (
            <a
              key={tag}
              href={`/blog/tag/${tag}`}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/20 text-secondary text-sm hover:bg-secondary/30 transition-colors"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </a>
          ))}
        </div>

        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </motion.article>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 flex justify-between"
      >
        <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-background-card border border-border text-foreground-muted hover:text-primary hover:border-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
          上一篇
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-background-card border border-border text-foreground-muted hover:text-primary hover:border-primary transition-colors">
          下一篇
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </button>
      </motion.div>
    </div>
  );
}

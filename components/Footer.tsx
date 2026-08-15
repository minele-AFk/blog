'use client';

import { motion } from 'framer-motion';
import { Heart, GitBranch, Send, Mail, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-16 py-12 footer"
      style={{
        borderTop: '1px solid rgba(168, 85, 247, 0.15)',
        background: 'rgba(10, 10, 18, 0.6)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }}
              >
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-bold text-white">Adminの二次元博客</span>
            </div>
            <p className="text-sm text-foreground-muted leading-relaxed">
              在代码与二次元之间穿梭的个人空间，记录技术学习、生活感悟和动漫推荐。
            </p>
          </div>

          <div>
            <h4 className="font-medium text-white mb-4">快速链接</h4>
            <ul className="space-y-2">
              {['首页', '杂谈', '项目', '相册', '关于'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-foreground-muted hover:text-primary transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-white mb-4">联系我</h4>
            <div className="flex items-center gap-3">
              <motion.a
                href="#"
                whileHover={{ scale: 1.1, y: -2 }}
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-white/10 transition-colors"
              >
                <GitBranch className="w-4 h-4" />
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.1, y: -2 }}
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-white/10 transition-colors"
              >
                <Send className="w-4 h-4" />
              </motion.a>
              <motion.a
                href="#"
                whileHover={{ scale: 1.1, y: -2 }}
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-white/10 transition-colors"
              >
                <Mail className="w-4 h-4" />
              </motion.a>
            </div>
            <p className="text-sm text-foreground-muted mt-4">
              合作或交流欢迎邮件联系
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1 text-foreground-muted text-sm">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-accent fill-accent" />
              <span>by Admin</span>
            </div>
            <div className="text-sm text-foreground-muted">
              <span>出品/发行：虚研制作/兰音工作室</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-foreground-muted">
              <span>&copy; 2026 Adminの二次元博客</span>
              <a href="/admin" className="px-3 py-1 rounded-full bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 hover:text-white transition-all">
                🔧 管理后台
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}

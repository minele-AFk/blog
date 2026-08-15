'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageCircle,
  Folder,
  Link2,
  FileText,
  Images,
  Menu,
  X,
  Sparkles,
  Heart,
  Home,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { name: '仪表盘', href: '/admin', icon: LayoutDashboard, emoji: '✨' },
  { name: '说说管理', href: '/admin/moments', icon: MessageCircle, emoji: '💬' },
  { name: '项目管理', href: '/admin/projects', icon: Folder, emoji: '📁' },
  { name: '友链管理', href: '/admin/friends', icon: Link2, emoji: '🔗' },
  { name: '文章管理', href: '/admin/posts', icon: FileText, emoji: '📝' },
  { name: '图库管理', href: '/admin/gallery', icon: Images, emoji: '🖼️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [loading, isAuthenticated, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #fdf2f8, #fce7f3, #f3e8ff)' }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!isAuthenticated && pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 30%, #faf5ff 60%, #f0f9ff 100%)',
      }}
    >
      {/* 柔和背景装饰 */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ overflow: 'hidden' }}>
        {/* 粉色光晕 */}
        <div
          className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(244,114,182,0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {/* 紫色光晕 */}
        <div
          className="absolute bottom-[-10%] left-[-5%] w-[350px] h-[350px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(192,132,252,0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {/* 青色小光晕 */}
        <div
          className="absolute top-[40%] left-[20%] w-[200px] h-[200px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(34,211,238,0.25) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* 浮动星星装饰 */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-pink-300/40"
            style={{
              left: `${15 + i * 15}%`,
              top: `${10 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [0, -8, 0],
              opacity: [0.3, 0.6, 0.3],
              rotate: [0, 15, 0],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.4,
            }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
        ))}
      </div>

      {/* 顶部导航栏 — 可爱粉色玻璃风格 */}
      <div
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '2px solid rgba(244, 114, 182, 0.2)',
          boxShadow: '0 4px 20px rgba(244, 114, 182, 0.1), 0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #f9a8d4, #c084fc)',
                  boxShadow: '0 3px 12px rgba(244,114,182,0.35)',
                }}
              >
                🌸
              </div>
              <span className="text-lg font-bold" style={{ color: '#db2777' }}>
                管理后台
              </span>
            </div>

            {/* 桌面导航 */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <motion.a
                    key={item.name}
                    href={item.href}
                    whileHover={{ y: -1, scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      color: isActive ? '#db2777' : '#6b7280',
                      background: isActive ? 'rgba(244, 114, 182, 0.15)' : 'transparent',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs mr-0.5">{item.emoji}</span>
                    {item.name}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                        style={{ background: '#ec4899', boxShadow: '0 0 6px rgba(236,72,153,0.6)' }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                  </motion.a>
                );
              })}
            </div>

            {/* 返回主页 + 移动端菜单 */}
            <div className="flex items-center gap-2">
              <motion.a
                href="/"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  color: '#8b5cf6',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                }}
              >
                <Home className="w-4 h-4" />
                返回主页
              </motion.a>

              <button
                className="md:hidden p-2 rounded-xl transition-colors"
                style={{ color: '#6b7280' }}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* 移动端菜单 */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t"
              style={{
                borderColor: 'rgba(244, 114, 182, 0.2)',
                background: 'rgba(255, 255, 255, 0.95)',
              }}
            >
              <div className="px-4 py-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200`}
                      style={{
                        color: isActive ? '#db2777' : '#6b7280',
                        background: isActive ? 'rgba(244, 114, 182, 0.12)' : 'transparent',
                      }}
                    >
                      <span>{item.emoji}</span>
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </a>
                  );
                })}
                <a
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
                  style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.08)' }}
                >
                  <Home className="w-5 h-5" />
                  返回主页
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 主内容区 */}
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

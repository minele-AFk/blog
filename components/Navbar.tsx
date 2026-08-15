'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { LogOut, User, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const [clickCount, setClickCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const clickCountRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const [showNav, setShowNav] = useState(true);

  const navLinks = [
    { name: '首页', href: '/' },
    { name: '项目', href: '/projects' },
    { name: '归档', href: '/archive' },
    { name: '说说', href: '/moments' },
    { name: '友链', href: '/friends' },
    { name: '追番', href: '/anime' },
    { name: '关于', href: '/about' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogoClick = useCallback((): boolean => {
    if (isAuthenticated) return false;
    
    clickCountRef.current += 1;
    
    if (clickCountRef.current >= 4) {
      router.push('/admin/login');
      clickCountRef.current = 0;
      setClickCount(0);
      return true;
    }
    
    setClickCount(clickCountRef.current);
    return false;
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (clickCount > 0) {
      const timer = setTimeout(() => {
        setClickCount(0);
        clickCountRef.current = 0;
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [clickCount]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 控制导航栏滚动收起/显示
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollYRef.current && currentScrollY > 80) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }
      lastScrollYRef.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleNavLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  // 管理后台页面隐藏主站导航栏（放在所有 hooks 之后，避免违反 hooks 规则）
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 navbar transition-transform duration-500 ${showNav ? 'translate-y-0' : '-translate-y-full'}`}
        style={{
          background: 'rgba(10, 10, 18, 0.6)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(168, 85, 247, 0.1)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div 
            className="text-lg font-bold select-none inline-flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              const triggeredModal = handleLogoClick();
              if (!triggeredModal && clickCountRef.current === 0) {
                router.push('/');
              }
            }}
            style={{ userSelect: 'none', WebkitUserSelect: 'none', cursor: 'default' }}
          >
            <span className="text-white">戏子多秋</span>
            <span className="text-primary">の</span>
            <span className="text-white">小站</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <motion.div
                key={link.name}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <Link
                  href={link.href}
                  className={`px-3 py-2 text-sm transition-all duration-300 relative ${
                    isActive(link.href)
                      ? 'text-blue-400 font-medium'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.name}
                  {isActive(link.href) && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-400"
                    />
                  )}
                </Link>
              </motion.div>
            ))}

            {isAuthenticated && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="ml-2"
              >
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors">
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 hover:text-purple-300 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">管理</span>
                  </Link>
                  <span className="w-px h-4 bg-purple-400/50" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogout();
                    }}
                    className="p-1 rounded hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-colors"
                    title="退出"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <motion.button
            className="md:hidden w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-foreground-muted hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden fixed top-14 left-0 right-0 z-40 mobile-menu"
            style={{
              background: 'rgba(10, 10, 18, 0.95)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(168, 85, 247, 0.1)',
            }}
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={handleNavLinkClick}
                    className={`block px-4 py-3 rounded-lg text-base transition-all duration-300 ${
                      isActive(link.href)
                        ? 'text-blue-400 font-medium bg-blue-400/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}

              {isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="pt-4 border-t border-white/10"
                >
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">管理</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">退出登录</span>
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
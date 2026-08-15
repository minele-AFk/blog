'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Sakura from '@/components/Sakura';
import ParticleBackground from '@/components/ParticleBackground';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupBlocked, setSetupBlocked] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const checkSetupMode = async () => {
    try {
      const res = await fetch('/api/admin/login');
      const data = await res.json();
      if (!data.hasPassword && !data.initializable) {
        setSetupBlocked(true);
        setIsSetupMode(false);
      } else {
        setIsSetupMode(!data.hasPassword);
      }
    } catch {
      setIsSetupMode(false);
    }
  };

  useEffect(() => {
    checkSetupMode();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '登录失败');
        return;
      }

      if (!data.token) {
        setError('登录响应异常，请重试');
        return;
      }

      login(data.token);
      setTimeout(() => {
        router.push('/admin');
      }, 100);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 装饰性星星位置（useMemo 防止每次渲染重新生成）
  const sparkles = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 4 + Math.random() * 6,
        delay: Math.random() * 4,
        duration: 2 + Math.random() * 3,
      })),
    [],
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景：粒子 + 樱花 */}
      <ParticleBackground />
      <Sakura />

      {/* 浮动装饰星 */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {sparkles.map((s) => (
          <div
            key={s.id}
            className="absolute"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animation: `sparkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          >
            <Sparkles className="w-full h-full text-pink-400/60" />
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-full max-w-md relative z-20"
      >
        {/* 卡片外发光层 */}
        <div
          className="absolute -inset-1 rounded-3xl opacity-60"
          style={{
            background:
              'linear-gradient(135deg, rgba(236,72,153,0.5), rgba(168,85,247,0.5), rgba(6,182,212,0.5), rgba(236,72,153,0.5))',
            backgroundSize: '300% 300%',
            animation: 'border-shimmer 6s ease-in-out infinite',
            filter: 'blur(12px)',
          }}
        />

        {/* 主卡片 */}
        <div className="relative glass-card rounded-3xl p-8 pt-10" style={{ animation: 'card-glow 4s ease-in-out infinite' }}>
          {/* 四角装饰 */}
          <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-pink-400/70 rounded-tl-xl z-10" />
          <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-cyan-400/70 rounded-tr-xl z-10" />
          <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-purple-400/70 rounded-bl-xl z-10" />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-pink-400/70 rounded-br-xl z-10" />

          {/* 顶部日文标签 */}
          <div className="text-center mb-1">
            <span className="text-xs tracking-[0.3em] text-pink-300/70 font-medium select-none">
              ようこそ ・ WELCOME
            </span>
          </div>

          {/* 图标区域 */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center mb-5">
              {/* 外圈光环 */}
              <div
                className="absolute w-20 h-20 rounded-full"
                style={{
                  background:
                    'conic-gradient(from 0deg, rgba(236,72,153,0.8), rgba(168,85,247,0.3), rgba(6,182,212,0.8), rgba(168,85,247,0.3), rgba(236,72,153,0.8))',
                  animation: 'border-shimmer 4s linear infinite',
                }}
              />
              {/* 内圈：二次元角色头像 */}
              <div className="relative w-[76px] h-[76px] rounded-full p-[3px] bg-gradient-to-br from-pink-500/60 via-purple-500/40 to-cyan-500/60">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/20 bg-white/10">
                  <motion.img
                    src="/background/login-avatar.png"
                    alt="管理员"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
                {/* 图标旁小星星 */}
                <span className="absolute -top-1 -right-1 w-3 h-3" style={{ animation: 'sparkle 2s ease-in-out infinite' }}>
                  <Sparkles className="w-full h-full text-pink-400" />
                </span>
                {/* 底部小爱心 */}
                <span className="absolute -bottom-1 -left-1 w-3 h-3" style={{ animation: 'sparkle 2.5s ease-in-out 0.5s infinite' }}>
                  <Sparkles className="w-full h-full text-cyan-400" />
                </span>
              </div>
            </div>

            <h1 className="text-2xl font-bold mb-2">
              <span
                className="text-gradient"
                style={{ backgroundSize: '200% 200%', animation: 'border-shimmer 4s ease-in-out infinite' }}
              >
                {setupBlocked ? '管理员尚未初始化' : isSetupMode ? '初始化管理员密码' : '管理员登录'}
              </span>
            </h1>
            <p className="text-foreground-muted text-sm">
              {setupBlocked
                ? '请在服务器配置 ADMIN_PASSWORD 环境变量后重启服务，即可用该密码登录'
                : isSetupMode
                  ? '输入 ADMIN_PASSWORD 环境变量中配置的密码完成初始化'
                  : '请输入管理员密码'}
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/15 border border-red-400/30 text-red-300 mb-6 backdrop-blur-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {setupBlocked ? (
            <div className="py-6 text-center">
              <p className="text-foreground-muted text-sm leading-relaxed">
                管理员尚未初始化。请在服务器配置{' '}
                <code className="text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded">ADMIN_PASSWORD</code>{' '}
                环境变量后重启服务，即可用该密码登录。
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 密码输入 */}
              <div className="group relative">
                <label className="block text-sm font-medium text-foreground-muted mb-2 flex items-center gap-1.5">
                  <span className="text-pink-400">✦</span>
                  密码
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-foreground-muted/50 focus:outline-none focus:border-pink-500/70 focus:ring-2 focus:ring-pink-500/20 transition-all duration-300"
                    style={{ animation: password ? 'input-glow 3s ease-in-out infinite' : undefined }}
                    autoFocus
                  />
                  {/* 输入框装饰星 */}
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <Sparkles className="w-4 h-4 text-pink-400/60" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* 登录按钮 */}
              <motion.button
                type="submit"
                disabled={loading || !password}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed group"
                style={{
                  background: 'linear-gradient(90deg, #ec4899, #a855f7, #06b6d4, #ec4899)',
                  backgroundSize: '300% 100%',
                  animation: password && !loading ? 'border-shimmer 3s linear infinite' : undefined,
                  boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(236, 72, 153, 0.15)',
                }}
              >
                {/* shine 光效 */}
                {!loading && (
                  <span
                    className="absolute inset-0 w-1/3 bg-white/20"
                    style={{ animation: 'shine 3s ease-in-out infinite' }}
                  />
                )}

                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-2 h-2 rounded-full bg-white"
                          animate={{ scale: [0, 1, 0], opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </span>
                  ) : (
                    <>
                      {isSetupMode ? '初始化并登录' : '登 录'}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </motion.button>
            </form>
          )}

          {/* 底部提示 */}
          {!isSetupMode && !setupBlocked && (
            <div className="text-center mt-6">
              <p className="text-foreground-muted/70 text-xs">
                如果忘记密码，请联系开发者重置
              </p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="w-1 h-1 rounded-full bg-pink-400/40" />
                <span className="w-1 h-1 rounded-full bg-purple-400/40" />
                <span className="w-1 h-1 rounded-full bg-cyan-400/40" />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

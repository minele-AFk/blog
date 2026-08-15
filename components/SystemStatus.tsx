'use client';

import { motion } from 'framer-motion';
import { Clock, Activity, Wifi } from 'lucide-react';
import { useState, useEffect, memo } from 'react';

// 系统启动时间 - 固定为 2026-07-18 09:00:00
const SYSTEM_START_DATE = new Date('2026-07-18T09:00:00');

// 技术栈信息
const TECH_STACK = [
  { name: 'Next.js', version: '16', color: 'surface-light text-title' },
  { name: 'React', version: '19', color: 'tag-badge' },
  { name: 'Tailwind', version: '4', color: 'tag-badge' },
  { name: 'TypeScript', version: '5', color: 'tag-badge' },
];

interface UptimeInfo {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

function calculateUptime(now: Date): UptimeInfo {
  const diff = now.getTime() - SYSTEM_START_DATE.getTime();
  const totalSeconds = Math.floor(diff / 1000);

  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  });
}

// 运行时长 - 独立 memo 子组件，每秒只更新自身，不影响父组件
const UptimeText = memo(function UptimeText() {
  const [uptime, setUptime] = useState<UptimeInfo | null>(null);

  useEffect(() => {
    const tick = () => setUptime(calculateUptime(new Date()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-sm text-muted mt-0.5">
      已稳定运行：
      {uptime ? (
        <>
          <span className="text-accent font-medium">{uptime.days}</span> 天{' '}
          <span className="text-accent font-medium">{uptime.hours}</span> 小时{' '}
          <span className="text-accent font-medium">{uptime.minutes}</span> 分{' '}
          <span className="text-accent font-medium">{uptime.seconds}</span> 秒
        </>
      ) : (
        '-- 天 -- 小时 -- 分 -- 秒'
      )}
    </p>
  );
});

// 实时时钟 - 独立 memo 子组件，每秒只更新自身，不影响父组件
const LiveClock = memo(function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <div className="text-2xl font-bold text-title font-mono tabular-nums">
        {now ? formatTime(now) : '--:--:--'}
      </div>
      <div className="text-xs text-muted mt-0.5">
        {now ? formatDate(now) : '---- -- -- --'}
      </div>
    </div>
  );
});

export default function SystemStatus() {
  // 仅用于入场动画，不再拦截内容渲染（避免 SSR 阶段一直显示"加载中"）
  const [isClient, setIsClient] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 检测网络状态（低频事件，不影响性能）
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <motion.div
      initial={isClient ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-card neon-border p-5 md:col-span-2"
    >
      <div className="flex items-center gap-4">
        {/* 时钟图标 */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl btn-info flex items-center justify-center border">
          <Clock className="w-6 h-6" />
        </div>

        {/* 系统信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-title">系统状态</h3>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${
              isOnline
                ? 'bg-green-500/20 text-green-600'
                : 'bg-red-500/20 text-red-600'
            }`}>
              <Wifi className="w-3 h-3" />
              {isOnline ? '在线' : '离线'}
            </div>
          </div>
          <UptimeText />
        </div>

        {/* 实时时间 */}
        <LiveClock />
      </div>

      {/* 技术栈标签 */}
      <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-soft">
        {TECH_STACK.map((tech) => (
          <span
            key={tech.name}
            className={`px-3 py-1 text-xs rounded-full border border-soft ${tech.color}`}
          >
            {tech.name} {tech.version}
          </span>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <Activity className="w-4 h-4 text-green-600" />
          <span className="text-xs text-green-600">运行正常</span>
        </div>
      </div>
    </motion.div>
  );
}

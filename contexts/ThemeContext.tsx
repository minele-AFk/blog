'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'night' | 'day';
type ThemeMode = 'manual' | 'auto' | 'schedule';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 根据日期计算日出日落时间（简化版，基于纬度35°N，经度105°E - 中国中心位置）
function getSunTimes(date: Date) {
  const month = date.getMonth(); // 0-11
  // 简化的日出日落时间表（基于中国中部地区）
  const sunTimes: Record<number, { sunrise: number; sunset: number }> = {
    0: { sunrise: 7.5, sunset: 17.2 },   // 1月
    1: { sunrise: 7.1, sunset: 17.8 },   // 2月
    2: { sunrise: 6.5, sunset: 18.3 },   // 3月
    3: { sunrise: 5.9, sunset: 18.8 },   // 4月
    4: { sunrise: 5.4, sunset: 19.3 },   // 5月
    5: { sunrise: 5.2, sunset: 19.7 },   // 6月
    6: { sunrise: 5.4, sunset: 19.6 },   // 7月
    7: { sunrise: 5.8, sunset: 19.1 },   // 8月
    8: { sunrise: 6.2, sunset: 18.4 },   // 9月
    9: { sunrise: 6.7, sunset: 17.7 },   // 10月
    10: { sunrise: 7.2, sunset: 17.1 },  // 11月
    11: { sunrise: 7.6, sunset: 17.0 },  // 12月
  };
  return sunTimes[month];
}

// 根据当前时间判断是否为白天
function isDayTime(): boolean {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const { sunrise, sunset } = getSunTimes(now);
  return hour >= sunrise && hour < sunset;
}

// 根据系统偏好判断
function isSystemDark(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('night');
  // 默认跟随系统自动切换
  const [mode, setMode] = useState<ThemeMode>('auto');

  // 应用主题
  const applyTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    if (newTheme === 'day') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, []);

  // 初始化
  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode') as ThemeMode | null;
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    
    if (savedMode === 'schedule') {
      // 日出日落
      setMode('schedule');
      applyTheme(isDayTime() ? 'day' : 'night');
    } else if (savedMode === 'manual' && savedTheme) {
      // 手动模式（用户明确选择过）
      setMode('manual');
      applyTheme(savedTheme);
    } else {
      // 默认：跟随系统自动切换
      setMode('auto');
      applyTheme(isSystemDark() ? 'night' : 'day');
    }
  }, [applyTheme]);

  // 定时检查（日出日落模式）
  useEffect(() => {
    if (mode !== 'schedule') return;
    
    const checkTime = () => {
      const newTheme = isDayTime() ? 'day' : 'night';
      setTheme(prev => {
        if (prev !== newTheme) {
          applyTheme(newTheme);
        }
        return prev;
      });
    };
    
    // 每分钟检查一次
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [mode, applyTheme]);

  // 监听系统主题变化
  useEffect(() => {
    if (mode !== 'auto') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? 'night' : 'day');
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mode, applyTheme]);

  const toggleTheme = () => {
    const newTheme = theme === 'night' ? 'day' : 'night';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    // 切换后改为手动模式
    setMode('manual');
    localStorage.setItem('themeMode', 'manual');
  };

  const handleSetMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
    
    if (newMode === 'auto') {
      applyTheme(isSystemDark() ? 'night' : 'day');
    } else if (newMode === 'schedule') {
      applyTheme(isDayTime() ? 'day' : 'night');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode: handleSetMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

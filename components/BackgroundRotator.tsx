'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const BACKGROUND_IMAGES = [
  '/background/f31db8d62b2618ddc7049500c47b40ea.jpg',
  '/background/OIP-C.oLRVvRL1aftWdSj4_DugKwHaEM.webp',
  '/background/doro-q.png',
  '/background/fate-saber.png',
  '/background/anime-night.png',
  '/background/anime.png',
  '/background/anime-girl.png',
  '/background/3840x2160.jpg',
];

const ROTATION_INTERVAL = 8000;
const TRANSITION_DURATION = 800;
const ROUTE_CHANGE_COOLDOWN = 3000; // 路由切换后 3 秒内不再响应路由变化

const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();

function preloadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }

  if (loadingPromises.has(src)) {
    return loadingPromises.get(src)!;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      reject(new Error('Image load timeout'));
      loadingPromises.delete(src);
    }, 15000);

    img.onload = () => {
      clearTimeout(timeout);
      imageCache.set(src, img);
      loadingPromises.delete(src);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      loadingPromises.delete(src);
      reject(new Error('Image load failed'));
    };

    img.src = src;
  });

  loadingPromises.set(src, promise);
  return promise;
}

interface BackgroundRotatorProps {
  routeKey?: string;
}

export default function BackgroundRotator({ routeKey }: BackgroundRotatorProps) {
  const { theme } = useTheme();
  const isDayMode = theme === 'day';
  const [currentImage, setCurrentImage] = useState('');
  const [nextImage, setNextImage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const hasInitializedRef = useRef(false);
  const lastRouteKeyRef = useRef(routeKey);
  const isTransitioningRef = useRef(false);
  const isVisibleRef = useRef(true);
  const lastRouteChangeTimeRef = useRef(0); // 记录最后一次路由切换触发的时间

  useEffect(() => {
    if (hasInitializedRef.current) return;

    const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
    const image = BACKGROUND_IMAGES[randomIndex];
    
    preloadImage(image).then(() => {
      setCurrentImage(image);
      setIsLoaded(true);
      hasInitializedRef.current = true;
    }).catch(() => {
      setCurrentImage(image);
      setIsLoaded(true);
      hasInitializedRef.current = true;
    });

    BACKGROUND_IMAGES.forEach(src => preloadImage(src));
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const switchBackground = useCallback((newImage: string) => {
    if (isTransitioningRef.current || newImage === currentImage) return;
    isTransitioningRef.current = true;

    preloadImage(newImage).then(() => {
      setNextImage(newImage);
      
      setTimeout(() => {
        setCurrentImage(newImage);
        setNextImage(null);
        isTransitioningRef.current = false;
      }, TRANSITION_DURATION);
    }).catch(() => {
      isTransitioningRef.current = false;
    });
  }, [currentImage]);

  // 路由变化触发背景切换（带冷却保护）
  useEffect(() => {
    if (!isLoaded || routeKey === lastRouteKeyRef.current) return;
    
    lastRouteKeyRef.current = routeKey;

    // 冷却保护：路由切换后 3 秒内不再响应
    const now = Date.now();
    const timeSinceLastChange = now - lastRouteChangeTimeRef.current;
    if (timeSinceLastChange < ROUTE_CHANGE_COOLDOWN) {
      return;
    }

    lastRouteChangeTimeRef.current = now;

    const newIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
    switchBackground(BACKGROUND_IMAGES[newIndex]);
  }, [routeKey, isLoaded, switchBackground]);

  useEffect(() => {
    if (!isLoaded) return;

    const interval = setInterval(() => {
      if (!isVisibleRef.current || isTransitioningRef.current) return;

      let newIndex: number;
      do {
        newIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
      } while (BACKGROUND_IMAGES[newIndex] === currentImage && BACKGROUND_IMAGES.length > 1);

      switchBackground(BACKGROUND_IMAGES[newIndex]);
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [isLoaded, currentImage, switchBackground]);

  useEffect(() => {
    if (!isLoaded) return;
    
    const preloadNext = () => {
      BACKGROUND_IMAGES.forEach(src => {
        if (src !== currentImage && !imageCache.has(src)) {
          preloadImage(src).catch(() => {});
        }
      });
    };

    preloadNext();
    const timer = setTimeout(preloadNext, 5000);
    return () => clearTimeout(timer);
  }, [isLoaded, currentImage]);

  if (!isLoaded) {
    return (
      <div className={`fixed inset-0 z-0 bg-gradient-to-b ${
        isDayMode
          ? 'from-[#f8fafc] via-[#eef2ff] to-[#f8fafc]'
          : 'from-[#0a0a12] via-[#0f0f1a] to-[#0f0f1a]'
      }`}>
        <div className={`absolute inset-0 bg-gradient-to-b ${
          isDayMode
            ? 'from-white/40 via-transparent to-white/40'
            : 'from-black/60 via-transparent to-black/80'
        }`} />
      </div>
    );
  }

  // 主题感知的背景效果：日间模式适当提亮保证文字可读，夜间模式保持暗色调
  const bgFilter = isDayMode
    ? 'blur(3px) brightness(0.9) saturate(0.95)'
    : 'blur(3px) brightness(0.45) saturate(1.0)';
  const overlayClass = isDayMode
    ? 'absolute inset-0 bg-gradient-to-b from-white/60 via-white/20 to-white/60'
    : 'absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80';

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${currentImage})`,
          filter: bgFilter,
          transform: 'scale(1.05)',
          willChange: 'opacity',
        }}
      />

      {nextImage && (
        <motion.div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${nextImage})`,
            filter: bgFilter,
            transform: 'scale(1.05)',
            willChange: 'opacity',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: TRANSITION_DURATION / 1000, ease: 'easeInOut' }}
        />
      )}

      <div className={overlayClass} />
    </div>
  );
}

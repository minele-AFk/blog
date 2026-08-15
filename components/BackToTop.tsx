'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          whileHover={{ scale: 1.1, y: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center text-white glow-purple"
          style={{ background: 'linear-gradient(135deg, #a855f7, #06b6d4)' }}
          aria-label="回到顶部"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
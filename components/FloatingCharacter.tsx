'use client';

import { motion } from 'framer-motion';

export default function FloatingCharacter() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      className="fixed bottom-8 right-8 z-40 hidden lg:block"
    >
      <motion.div
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <div 
          className="w-32 h-48 rounded-2xl overflow-hidden border-2 border-primary/30 glow-purple"
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(6, 182, 212, 0.2))',
          }}
        >
          <img
            src="/background/anime-girl.png"
            alt="Character"
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.8 }}
          className="absolute -top-4 -left-16 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-primary/20"
        >
          <p className="text-sm text-gray-800">欢迎来到我的博客！✨</p>
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0"
            style={{
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderLeft: '8px solid rgba(255, 255, 255, 0.9)',
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

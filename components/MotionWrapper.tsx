'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface MotionWrapperProps {
  children: React.ReactNode;
}

export default function MotionWrapper({ children }: MotionWrapperProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ 
            duration: 0.5, 
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
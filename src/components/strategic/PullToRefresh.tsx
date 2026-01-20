'use client';

import { ReactNode, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface Props {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const pullProgress = useTransform(y, [0, 100], [0, 1]);
  const rotation = useTransform(y, [0, 100], [0, 360]);

  const handleDragEnd = async () => {
    if (y.get() > 80 && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    y.set(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Pull indicator */}
      <motion.div
        style={{ y, opacity: pullProgress }}
        className="absolute top-0 left-0 right-0 flex justify-center py-4 z-10"
      >
        <motion.div
          style={{ rotate: rotation }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
        >
          <RefreshCw 
            size={24} 
            className={isRefreshing ? 'text-purple-400' : 'text-white/50'} 
          />
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        style={{ y }}
        onDragEnd={handleDragEnd}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}

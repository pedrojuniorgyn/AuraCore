'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';
import { Star } from 'lucide-react';

interface Props {
  points: number;
  label?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

export function PointsCounter({
  points,
  label = 'XP',
  showIcon = true,
  size = 'md',
  animate: shouldAnimate = true,
}: Props) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (shouldAnimate) {
      const controls = animate(count, points, {
        duration: 1.5,
        ease: 'easeOut',
      });
      return controls.stop;
    } else {
      count.set(points);
    }
  }, [count, points, shouldAnimate]);

  return (
    <div className="flex items-center gap-2">
      {showIcon && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Star className="text-white" size={18} />
        </div>
      )}
      <div>
        <motion.span className={`font-bold text-white ${sizeClasses[size]}`}>
          {shouldAnimate ? (
            <motion.span>{rounded}</motion.span>
          ) : (
            points.toLocaleString()
          )}
        </motion.span>
        <span className="text-white/60 ml-1">{label}</span>
      </div>
    </div>
  );
}

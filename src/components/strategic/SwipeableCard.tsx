'use client';

import { ReactNode } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Trash2, Check } from 'lucide-react';

interface SwipeAction {
  icon: ReactNode;
  color: string;
  label: string;
}

interface Props {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
}

const defaultLeftAction: SwipeAction = { 
  icon: <Check size={20} />, 
  color: 'green', 
  label: 'Concluir' 
};

const defaultRightAction: SwipeAction = { 
  icon: <Trash2 size={20} />, 
  color: 'red', 
  label: 'Excluir' 
};

export function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  leftAction = defaultLeftAction,
  rightAction = defaultRightAction,
}: Props) {
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (info.offset.x < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Left Action Background */}
      <div className={`absolute inset-y-0 left-0 w-24 bg-${leftAction.color}-500 
        flex items-center justify-center`}>
        <div className="text-white flex flex-col items-center">
          {leftAction.icon}
          <span className="text-xs mt-1">{leftAction.label}</span>
        </div>
      </div>

      {/* Right Action Background */}
      <div className={`absolute inset-y-0 right-0 w-24 bg-${rightAction.color}-500 
        flex items-center justify-center`}>
        <div className="text-white flex flex-col items-center">
          {rightAction.icon}
          <span className="text-xs mt-1">{rightAction.label}</span>
        </div>
      </div>

      {/* Card Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={handleDragEnd}
        className="relative bg-gray-800 touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}

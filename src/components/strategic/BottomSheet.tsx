'use client';

import { ReactNode, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({ isOpen, onClose, children, title }: Props) {
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Se arrastou para baixo rápido ou muito, fecha
    if (velocity > 500 || offset > 200) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="fixed left-0 right-0 bottom-0 z-50 max-h-[90vh]"
          >
            <div className="bg-gray-900 rounded-t-3xl border-t border-white/10 overflow-hidden">
              {/* Handle */}
              <div 
                className="flex justify-center py-4 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="w-12 h-1.5 rounded-full bg-white/30" />
              </div>

              {/* Title */}
              {title && (
                <div className="px-6 pb-4 border-b border-white/10">
                  <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>
              )}

              {/* Content */}
              <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
                {children}
              </div>

              {/* Safe area padding for iOS */}
              <div className="h-safe" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

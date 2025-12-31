"use client";

import { motion } from "framer-motion";

interface PulsatingBadgeProps {
  count: number;
  color?: string;
}

export function PulsatingBadge({ count, color = "bg-red-500" }: PulsatingBadgeProps) {
  if (count === 0) return null;

  return (
    <motion.span
      className={`relative inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white ${color} rounded-full`}
      animate={{
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {count}
      <span className="absolute inset-0 rounded-full bg-current opacity-20 animate-ping" />
    </motion.span>
  );
}































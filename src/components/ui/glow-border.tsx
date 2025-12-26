"use client";

import { motion } from "framer-motion";

interface GlowBorderProps {
  color?: string;
  intensity?: number;
  animated?: boolean;
}

export function GlowBorder({ 
  color = "rgba(99, 102, 241, 0.5)", 
  intensity = 0.3,
  animated = true 
}: GlowBorderProps) {
  return (
    <motion.div
      className="absolute inset-0 rounded-lg pointer-events-none"
      style={{
        background: `linear-gradient(90deg, ${color}, transparent, ${color})`,
        opacity: intensity,
      }}
      animate={
        animated
          ? {
              opacity: [intensity, intensity * 1.5, intensity],
            }
          : {}
      }
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}






















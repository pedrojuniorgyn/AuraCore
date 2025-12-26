"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThreeDButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
}

export function ThreeDButton({
  className,
  children,
  ...props
}: ThreeDButtonProps) {
  return (
    <motion.button
      whileHover={{ 
        scale: 1.05,
        rotateX: 5,
        rotateY: 5,
      }}
      whileTap={{ 
        scale: 0.95,
        rotateX: 0,
        rotateY: 0,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        "relative px-6 py-3 rounded-lg font-semibold text-white",
        "bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600",
        "border border-white/10",
        "shadow-[0_10px_20px_rgba(168,85,247,0.3)]",
        "hover:shadow-[0_15px_30px_rgba(168,85,247,0.4)]",
        "transition-shadow duration-300",
        // Efeito 3D
        "before:absolute before:inset-0 before:rounded-lg",
        "before:bg-gradient-to-br before:from-white/20 before:to-transparent",
        "before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        // Brilho superior
        "after:absolute after:top-0 after:left-1/4 after:right-1/4 after:h-px",
        "after:bg-gradient-to-r after:from-transparent after:via-white/50 after:to-transparent",
        className
      )}
      style={{
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      {...props}
    >
      <span className="relative z-10 drop-shadow-lg">{children}</span>
    </motion.button>
  );
}




















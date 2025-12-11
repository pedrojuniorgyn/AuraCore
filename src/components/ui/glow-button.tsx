"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
  glowColor?: string;
}

export function GlowButton({
  className,
  children,
  glowColor = "#a855f7",
  ...props
}: GlowButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative px-6 py-3 rounded-lg font-semibold text-white",
        "bg-gradient-to-r from-purple-600 to-pink-600",
        "border border-white/10",
        "overflow-hidden",
        "group",
        className
      )}
      style={{
        boxShadow: `0 0 20px ${glowColor}40`,
      }}
      {...props}
    >
      {/* Brilho pulsante */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at center, ${glowColor}40 0%, transparent 70%)`,
          animation: "pulse 2s infinite",
        }}
      />
      
      {/* Conteúdo */}
      <span className="relative z-10">{children}</span>
      
      {/* Brilho externo animado */}
      <div
        className="absolute -inset-1 rounded-lg opacity-75 group-hover:opacity-100 blur-lg transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, ${glowColor}, #ec4899)`,
          animation: "glow-rotate 3s linear infinite",
        }}
      />
    </motion.button>
  );
}










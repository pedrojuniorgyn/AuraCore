"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GradientBorderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
}

export function GradientBorderButton({
  className,
  children,
  ...props
}: GradientBorderButtonProps) {
  return (
    <div className="relative inline-block">
      {/* Border animado */}
      <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 opacity-75 blur-sm group-hover:opacity-100 transition-opacity animate-gradient-rotate" />
      
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative px-6 py-3 rounded-lg font-semibold text-white group",
          "bg-gradient-to-r from-purple-600 to-pink-600",
          "border-2 border-transparent",
          "shadow-lg hover:shadow-xl transition-shadow duration-300",
          "before:absolute before:inset-0 before:rounded-lg before:p-[2px]",
          "before:bg-gradient-to-r before:from-purple-600 before:via-pink-600 before:to-purple-600",
          "before:-z-10 before:animate-gradient-rotate",
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    </div>
  );
}






















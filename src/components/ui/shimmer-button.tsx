"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends Omit<React.ComponentPropsWithoutRef<"button">, "children"> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

export function ShimmerButton({
  shimmerColor = "#ffffff",
  shimmerSize = "0.05em",
  borderRadius = "0.5rem",
  shimmerDuration = "2s",
  background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  className,
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      style={
        {
          "--spread": "90deg",
          "--shimmer-color": shimmerColor,
          "--radius": borderRadius,
          "--speed": shimmerDuration,
          "--cut": shimmerSize,
          "--bg": background,
        } as React.CSSProperties
      }
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--radius)] transition-all duration-300",
        "before:absolute before:inset-0 before:z-[-1] before:translate-x-[-150%] before:translate-y-[-150%] before:animate-[shimmer-button_var(--speed)_infinite] before:bg-[conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] before:transition-transform",
        "shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/40",
        className
      )}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </motion.button>
  );
}

// Adicionar animação shimmer ao globals.css se ainda não existir
// @keyframes shimmer {
//   0% {
//     transform: translate(-150%, -150%) rotate(calc(270deg - (var(--spread) * 0.5)));
//   }
//   100% {
//     transform: translate(50%, 50%) rotate(calc(270deg - (var(--spread) * 0.5)));
//   }
// }


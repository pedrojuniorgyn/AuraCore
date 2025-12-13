"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type RippleButtonVariant = "default" | "secondary" | "outline" | "ghost";

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
  /**
   * Variante visual (compat com uso em telas).
   * Importante: não é repassada para o DOM como atributo.
   */
  variant?: RippleButtonVariant;
}

interface Ripple {
  x: number;
  y: number;
  id: number;
}

export function RippleButton({
  className,
  children,
  variant = "default",
  ...props
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = {
      x,
      y,
      id: Date.now(),
    };

    setRipples([...ripples, newRipple]);

    // Remove ripple após animação
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);

    // Chama onClick original se existir
    if (props.onClick) {
      props.onClick(e);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative px-6 py-3 rounded-lg font-semibold overflow-hidden",
        "shadow-lg hover:shadow-xl transition-shadow duration-300",
        variant === "default" && [
          "text-white",
          "bg-gradient-to-r from-purple-600 to-pink-600",
          "border border-white/10",
        ],
        variant === "secondary" && [
          "text-white",
          "bg-white/10 hover:bg-white/20",
          "border border-white/10",
        ],
        variant === "outline" && [
          "text-white",
          "bg-transparent hover:bg-white/5",
          "border border-white/20",
        ],
        variant === "ghost" && [
          "text-white",
          "bg-transparent hover:bg-white/10",
          "border border-transparent",
        ],
        className
      )}
      {...props}
      onClick={handleClick}
    >
      {/* Conteúdo */}
      <span className="relative z-10">{children}</span>

      {/* Ripple effects */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute rounded-full bg-white"
            style={{
              width: 20,
              height: 20,
              left: ripple.x - 10,
              top: ripple.y - 10,
            }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
}















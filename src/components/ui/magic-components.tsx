/**
 * Magic UI Components
 * 
 * Componentes com efeitos visuais modernos (estilo Magic UI)
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * ✨ Shimmer Button
 * 
 * Botão com efeito shimmer/brilho animado
 */
export function ShimmerButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 font-medium text-white transition-all duration-300 hover:scale-105",
        className
      )}
      {...props}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{
          backgroundPosition: ["200% 0%", "-200% 0%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
          backgroundSize: "200% 100%",
        }}
      />

      {/* Content */}
      <span className="relative z-10">{children}</span>

      {/* Glow on hover */}
      <div className="absolute inset-0 -z-20 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-75" />
    </button>
  );
}

/**
 * 🌈 Gradient Text
 * 
 * Texto com gradiente animado
 */
export function GradientText({
  children,
  className,
  animate = true,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { animate?: boolean }) {
  if (!animate) {
    return (
      <span
        className={cn(
          "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent",
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }

  return (
    <motion.span
      className={cn(
        "inline-block bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent",
        className
      )}
      animate={{
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "linear",
      }}
      style={{
        backgroundSize: "200% 200%",
      }}
      {...props}
    >
      {children}
    </motion.span>
  );
}

/**
 * 🔢 Number Counter
 * 
 * Contador animado de números (para KPIs)
 */
export function NumberCounter({
  value,
  duration = 2,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const updateCount = () => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        setCount(value);
        return;
      }

      const progress = 1 - remaining / (duration * 1000);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(value * easeOutQuart);

      requestAnimationFrame(updateCount);
    };

    updateCount();
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/**
 * 📊 Bento Grid
 * 
 * Layout em grid moderno estilo Apple
 */
export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid auto-rows-[200px] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  children,
  className,
  title,
  description,
  icon,
  span = 1,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  span?: 1 | 2 | 3;
}) {
  const spanClass = {
    1: "",
    2: "md:col-span-2",
    3: "lg:col-span-3",
  };

  return (
    <motion.div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6",
        spanClass[span],
        className
      )}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background gradient on hover */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Content */}
      {icon && <div className="mb-4 text-3xl">{icon}</div>}
      {title && <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>}
      {description && <p className="mb-4 text-sm text-slate-400">{description}</p>}
      {children}
    </motion.div>
  );
}

/**
 * ⭕ Orbiting Circles
 * 
 * Círculos orbitando (loading/decoração)
 */
export function OrbitingCircles({
  className,
  radius = 50,
  duration = 20,
  reverse = false,
}: {
  className?: string;
  radius?: number;
  duration?: number;
  reverse?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="absolute h-2 w-2 rounded-full bg-indigo-500"
          animate={{
            rotate: reverse ? -360 : 360,
          }}
          transition={{
            duration: duration,
            repeat: Infinity,
            ease: "linear",
            delay: (index * duration) / 3,
          }}
          style={{
            left: "50%",
            top: "50%",
            marginLeft: -4,
            marginTop: -4,
            transformOrigin: `0px ${radius}px`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * 📜 Marquee
 * 
 * Texto rolando infinito
 */
export function Marquee({
  children,
  className,
  speed = 50,
  pauseOnHover = true,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  pauseOnHover?: boolean;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        className="flex whitespace-nowrap"
        animate={{
          x: ["0%", "-100%"],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
        whileHover={pauseOnHover ? { animationPlayState: "paused" } : undefined}
      >
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0">{children}</div>
      </motion.div>
    </div>
  );
}

/**
 * ✨ Meteors
 * 
 * Meteoros caindo (background effect)
 */
export function Meteors({ number = 20 }: { number?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: number }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute h-0.5 w-0.5 rotate-[215deg] bg-slate-500"
          initial={{
            top: -10,
            left: Math.random() * window.innerWidth,
            opacity: 0,
          }}
          animate={{
            top: window.innerHeight + 10,
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 2 + 2,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "linear",
          }}
          style={{
            boxShadow: "0 0 0 1px #ffffff10",
          }}
        >
          <div className="h-[1px] w-[50px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-slate-500 to-transparent" />
        </motion.span>
      ))}
    </div>
  );
}

















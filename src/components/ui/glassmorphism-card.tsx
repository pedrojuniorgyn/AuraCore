/**
 * Glassmorphism Card Components
 * 
 * Cards com efeito vidro translúcido (estilo Aceternity UI)
 */

"use client";

import React, { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * 💎 Glassmorphism Card
 * 
 * Card com efeito vidro translúcido
 */
export function GlassmorphismCard({
  children,
  className,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"div">, "children"> & { children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-lg",
        "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-50",
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * 🎭 3D Card Effect
 * 
 * Card que segue o mouse com efeito 3D
 */
export function ThreeDCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7.5deg", "-7.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7.5deg", "7.5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();

    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={cn("relative", className)}
      {...(props as Record<string, unknown>)}
    >
      <div
        style={{
          transform: "translateZ(50px)",
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

/**
 * ✨ Hover Card Effect
 * 
 * Card que flutua e brilha no hover
 */
export function HoverCard({
  children,
  className,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"div">, "children"> & { children?: React.ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={cn("relative", className)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{
        y: -5,
        scale: 1.02,
      }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
      {...(props as Record<string, unknown>)}
    >
      {/* Glow effect */}
      <motion.div
        className="pointer-events-none absolute -inset-0.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 blur-lg"
        animate={{
          opacity: isHovered ? 0.4 : 0,
        }}
        transition={{
          duration: 0.3,
        }}
      />

      {/* Content */}
      <div className="relative">{children}</div>
    </motion.div>
  );
}

/**
 * 🌈 Gradient Border Card
 * 
 * Card com borda gradiente animada
 */
export function GradientBorderCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("group relative", className)} {...props}>
      {/* Animated gradient border */}
      <motion.div
        className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-75 blur"
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
      />

      {/* Card content */}
      <div className="relative rounded-xl bg-slate-900 p-6">{children}</div>
    </div>
  );
}

/**
 * 🎨 Spotlight Card
 * 
 * Card com efeito spotlight que segue o mouse
 */
export function SpotlightCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      className={cn("group relative overflow-hidden rounded-xl", className)}
      onMouseMove={handleMouseMove}
      {...props}
    >
      {/* Spotlight effect */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(79, 70, 229, 0.15), transparent 40%)`,
        }}
      />

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
}


























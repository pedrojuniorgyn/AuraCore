/**
 * Animated Wrappers
 * 
 * Componentes wrapper para adicionar animações facilmente
 */

"use client";

import React from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * 📜 Fade In on Scroll
 * 
 * Elemento que aparece com fade quando entra na viewport
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
} & React.HTMLAttributes<HTMLDivElement>) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const directionOffset = {
    up: { y: 40 },
    down: { y: -40 },
    left: { x: 40 },
    right: { x: -40 },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        ...directionOffset[direction],
      }}
      animate={
        isInView
          ? {
              opacity: 1,
              x: 0,
              y: 0,
            }
          : {}
      }
      transition={{
        duration: 0.6,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * 🎭 Stagger Children
 * 
 * Container que anima children com delay entre eles
 */
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 🌊 Scale In on Scroll
 * 
 * Elemento que cresce quando entra na viewport
 */
export function ScaleIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={
        isInView
          ? {
              opacity: 1,
              scale: 1,
            }
          : {}
      }
      transition={{
        duration: 0.5,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 🎬 Page Transition
 * 
 * Transição suave entre páginas
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * ↔️ Slide In
 * 
 * Elemento que desliza quando entra na viewport
 */
export function SlideIn({
  children,
  className,
  direction = "left",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: "left" | "right";
  delay?: number;
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        x: direction === "left" ? -100 : 100,
      }}
      animate={
        isInView
          ? {
              opacity: 1,
              x: 0,
            }
          : {}
      }
      transition={{
        duration: 0.6,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 🔄 Rotate In
 * 
 * Elemento que rotaciona quando entra na viewport
 */
export function RotateIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, rotate: -10, scale: 0.9 }}
      animate={
        isInView
          ? {
              opacity: 1,
              rotate: 0,
              scale: 1,
            }
          : {}
      }
      transition={{
        duration: 0.6,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 📝 Type Writer Effect
 * 
 * Texto que aparece com efeito máquina de escrever
 */
export function TypeWriter({
  text,
  className,
  delay = 0,
  speed = 0.05,
}: {
  text: string;
  className?: string;
  delay?: number;
  speed?: number;
}) {
  const [displayedText, setDisplayedText] = React.useState("");
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      let index = 0;

      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
        }
      }, speed * 1000);

      return () => clearInterval(interval);
    }, delay * 1000);

    return () => clearTimeout(timeout);
  }, [text, delay, speed]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          |
        </motion.span>
      )}
    </span>
  );
}

/**
 * 🎨 Blur Fade
 * 
 * Elemento que aparece com blur fade
 */
export function BlurFade({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, filter: "blur(10px)" }}
      animate={
        isInView
          ? {
              opacity: 1,
              filter: "blur(0px)",
            }
          : {}
      }
      transition={{
        duration: 0.6,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 💫 Sparkle Effect
 * 
 * Adiciona efeito de brilho/sparkle no hover
 */
export function Sparkle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [sparkles, setSparkles] = React.useState<
    Array<{ id: number; x: number; y: number }>
  >([]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (Math.random() > 0.9) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newSparkle = {
        id: Date.now(),
        x,
        y,
      };

      setSparkles((prev) => [...prev, newSparkle]);

      setTimeout(() => {
        setSparkles((prev) => prev.filter((s) => s.id !== newSparkle.id));
      }, 1000);
    }
  };

  return (
    <div className={cn("relative", className)} onMouseMove={handleMouseMove}>
      {children}
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="pointer-events-none absolute h-2 w-2 rounded-full bg-yellow-400"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: [0, 1, 0], opacity: [1, 1, 0] }}
          transition={{ duration: 1 }}
          style={{
            left: sparkle.x,
            top: sparkle.y,
          }}
        />
      ))}
    </div>
  );
}




















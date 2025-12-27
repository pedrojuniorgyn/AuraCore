/**
 * Animated Background Components
 * 
 * Backgrounds modernos com animações (estilo Aceternity UI)
 */

"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * 🌌 Grid Pattern Background
 * 
 * Fundo com grade animada
 */
export function GridPattern({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(51 65 85 / 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(51 65 85 / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      <motion.div
        className="absolute inset-0"
        animate={{
          backgroundPosition: ["0px 0px", "40px 40px"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(79 70 229 / 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(79 70 229 / 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}

/**
 * ⭐ Dot Pattern Background
 * 
 * Fundo com pontos animados
 */
export function DotPattern({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(rgb(100 116 139) 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }}
      />
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          backgroundPosition: ["0px 0px", "30px 30px"],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundImage: `radial-gradient(rgb(79 70 229) 1.5px, transparent 1.5px)`,
          backgroundSize: "30px 30px",
        }}
      />
    </div>
  );
}

/**
 * 🌟 Retro Grid Background
 * 
 * Grade retrô com perspectiva
 */
export function RetroGrid({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden [perspective:1000px]", className)}>
      <div className="absolute inset-0 [transform:rotateX(60deg)]">
        <motion.div
          className="h-[200%] w-full"
          animate={{
            y: ["0%", "-50%"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(79 70 229 / 0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(79 70 229 / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
    </div>
  );
}

/**
 * ✨ Aurora Background
 * 
 * Fundo com efeito aurora boreal animado
 */
export function AuroraBackground({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-slate-950", className)}>
      {/* Aurora Gradients */}
      <motion.div
        className="pointer-events-none absolute -top-1/2 left-0 h-full w-1/2"
        animate={{
          x: ["-25%", "25%", "-25%"],
          y: ["0%", "25%", "0%"],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: "radial-gradient(ellipse at center, rgba(79, 70, 229, 0.15), transparent 70%)",
        }}
      />
      <motion.div
        className="pointer-events-none absolute -top-1/2 right-0 h-full w-1/2"
        animate={{
          x: ["25%", "-25%", "25%"],
          y: ["25%", "0%", "25%"],
          scale: [1.1, 1, 1.1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.15), transparent 70%)",
        }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-0 left-1/2 h-1/2 w-1/2"
        animate={{
          x: ["-50%", "0%", "-50%"],
          y: ["0%", "-25%", "0%"],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.12), transparent 70%)",
        }}
      />

      {/* Noise Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * 🌊 Particles Background
 * 
 * Partículas flutuantes animadas
 */
export function ParticlesBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
    }> = [];

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    function animate() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle
        ctx.fillStyle = `rgba(79, 70, 229, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections
        particles.forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.strokeStyle = `rgba(79, 70, 229, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none absolute inset-0", className)}
    />
  );
}


























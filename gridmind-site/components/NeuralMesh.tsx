"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const TIER_COLORS = [
  "#3B82F6", // perception: blue
  "#8B5CF6", // reasoning: purple
  "#10B981", // execution: green
  "#F59E0B", // self_healing: amber
  "#06B6D4", // specialized: cyan
];

const PARTICLE_COUNT = 70;
const CONNECTION_DISTANCE = 200;
const PARTICLE_RADIUS_MIN = 2;
const PARTICLE_RADIUS_MAX = 4;
const SPEED_FACTOR = 0.3;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

function createParticle(width: number, height: number): Particle {
  const colorIndex = Math.floor(Math.random() * TIER_COLORS.length);
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * SPEED_FACTOR,
    vy: (Math.random() - 0.5) * SPEED_FACTOR,
    radius: PARTICLE_RADIUS_MIN + Math.random() * (PARTICLE_RADIUS_MAX - PARTICLE_RADIUS_MIN),
    color: TIER_COLORS[colorIndex],
    alpha: 0.4 + Math.random() * 0.6,
  };
}

export default function NeuralMesh() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const prefersReducedMotion = useRef(false);

  const initParticles = useCallback((width: number, height: number) => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(width, height)
    );
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mql.matches;

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mql.addEventListener("change", handleChange);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      initParticles(rect.width, rect.height);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const animate = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;

      if (!prefersReducedMotion.current) {
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;

          p.x = Math.max(0, Math.min(w, p.x));
          p.y = Math.max(0, Math.min(h, p.y));
        }
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DISTANCE) {
            const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.15;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
      mql.removeEventListener("change", handleChange);
    };
  }, [initParticles]);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
      />
    </motion.div>
  );
}

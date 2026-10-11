"use client";

import { useEffect, useRef } from "react";
import { registerFx, reducedMotion, type BurstOpts } from "@/game/fx";

type P = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  grav: number;
  rot: number;
  vr: number;
  r: number;
  g: number;
  b: number;
};

const POOL = 520;

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}

export default function Fx() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const shakeRef = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = reducedMotion();
    const parts: P[] = [];
    for (let i = 0; i < POOL; i++) {
      parts.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        max: 1,
        size: 2,
        grav: 0,
        rot: 0,
        vr: 0,
        r: 255,
        g: 255,
        b: 255,
      });
    }
    let cursor = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const shakeRoot = () => document.getElementById("shake-root");

    const api = {
      burst(x: number, y: number, opts: BurstOpts) {
        const count = Math.min(opts.count ?? 26, reduce ? 8 : 90);
        const color = opts.color ?? "#FFB627";
        const [r, g, b] = hexToRgb(color);
        const speed = opts.speed ?? 320;
        const spread = opts.spread ?? Math.PI * 2;
        const angle = opts.angle ?? 0;
        const grav = opts.gravity ?? 420;
        const size = opts.size ?? 3;
        for (let i = 0; i < count; i++) {
          const p = parts[cursor];
          cursor = (cursor + 1) % POOL;
          const a = angle - spread / 2 + Math.random() * spread;
          const s = speed * (0.35 + Math.random() * 0.85);
          p.active = true;
          p.x = x;
          p.y = y;
          p.vx = Math.cos(a) * s;
          p.vy = Math.sin(a) * s;
          p.max = 0.45 + Math.random() * 0.6;
          p.life = p.max;
          p.size = size * (0.5 + Math.random() * 1.1);
          p.grav = grav;
          p.rot = Math.random() * Math.PI;
          p.vr = (Math.random() - 0.5) * 14;
          p.r = r;
          p.g = g;
          p.b = b;
        }
      },
      shake(mag: number) {
        if (reduce) return;
        shakeRef.current = Math.min(Math.max(shakeRef.current, mag), 26);
      },
    };
    registerFx(api);

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;

      // screen shake decay + application
      const sr = shakeRoot();
      let m = shakeRef.current;
      if (m > 0.05) {
        const dx = (Math.random() * 2 - 1) * m;
        const dy = (Math.random() * 2 - 1) * m;
        const rot = (Math.random() * 2 - 1) * m * 0.02;
        if (sr) sr.style.transform = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) rotate(${rot.toFixed(3)}deg)`;
        shakeRef.current = m * Math.pow(0.0016, dt);
      } else if (m !== 0) {
        shakeRef.current = 0;
        if (sr) sr.style.transform = "translate3d(0,0,0)";
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < POOL; i++) {
        const p = parts[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.vy += p.grav * dt;
        p.vx *= 1 - 1.6 * dt;
        p.vy *= 1 - 0.6 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const t = p.life / p.max;
        const a = t * t;
        const s = p.size * (0.35 + t * 0.65);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a.toFixed(3)})`;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-s, -s * 0.45, s * 2, s * 0.9);
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      registerFx(null);
      const sr = shakeRoot();
      if (sr) sr.style.transform = "translate3d(0,0,0)";
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70]"
    />
  );
}

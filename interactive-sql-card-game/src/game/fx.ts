// Tiny imperative FX bus: pooled particles + screen shake, zero per-frame allocation.

export type FxApi = {
  burst: (x: number, y: number, opts: BurstOpts) => void;
  shake: (mag: number) => void;
};

export type BurstOpts = {
  color?: string;
  count?: number;
  speed?: number;
  spread?: number;
  angle?: number;
  gravity?: number;
  size?: number;
};

let api: FxApi | null = null;
export function registerFx(a: FxApi | null) {
  api = a;
}

export function burst(x: number, y: number, opts: BurstOpts = {}) {
  api?.burst(x, y, opts);
}
export function shake(mag: number) {
  api?.shake(mag);
}

/** burst centred on a DOM element */
export function burstEl(el: Element | null, opts: BurstOpts = {}) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}

export function shakeEl(el: Element | null, mag: number) {
  if (!el) return;
  shake(mag);
}

export const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

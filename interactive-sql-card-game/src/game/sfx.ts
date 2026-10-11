// Minimal WebAudio chip synth — no assets, no allocations in the hot path.
let ctx: AudioContext | null = null;
let enabled = true;
let loaded = false;

export function loadSoundPref() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  enabled = localStorage.getItem("qc.sound") !== "0";
}
export function setSound(on: boolean) {
  enabled = on;
  loaded = true;
  if (typeof window !== "undefined") localStorage.setItem("qc.sound", on ? "1" : "0");
}
export function soundOn() {
  return enabled;
}

function ac(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Voice = { f: number; to: number; d: number; type: OscillatorType; gain: number; delay?: number };

const VOICES: Record<string, Voice[]> = {
  card: [{ f: 320, to: 520, d: 0.06, type: "square", gain: 0.06 }],
  seat: [{ f: 180, to: 90, d: 0.1, type: "triangle", gain: 0.1 }],
  good: [
    { f: 660, to: 660, d: 0.07, type: "square", gain: 0.07 },
    { f: 990, to: 990, d: 0.09, type: "square", gain: 0.06, delay: 0.06 },
  ],
  crit: [
    { f: 520, to: 1040, d: 0.09, type: "square", gain: 0.08 },
    { f: 1560, to: 1560, d: 0.14, type: "triangle", gain: 0.06, delay: 0.07 },
  ],
  bad: [{ f: 200, to: 60, d: 0.24, type: "sawtooth", gain: 0.09 }],
  tick: [{ f: 1200, to: 1200, d: 0.03, type: "square", gain: 0.03 }],
  hit: [{ f: 130, to: 44, d: 0.2, type: "sawtooth", gain: 0.11 }],
  win: [
    { f: 523, to: 523, d: 0.1, type: "square", gain: 0.07 },
    { f: 659, to: 659, d: 0.1, type: "square", gain: 0.07, delay: 0.11 },
    { f: 880, to: 880, d: 0.26, type: "square", gain: 0.08, delay: 0.22 },
  ],
  lose: [
    { f: 220, to: 220, d: 0.16, type: "sawtooth", gain: 0.07 },
    { f: 174, to: 160, d: 0.5, type: "sawtooth", gain: 0.08, delay: 0.17 },
  ],
};

export function sfx(name: keyof typeof VOICES | string) {
  const c = ac();
  if (!c) return;
  const set = VOICES[name];
  if (!set) return;
  const now = c.currentTime;
  for (const v of set) {
    const t = now + (v.delay ?? 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = v.type;
    o.frequency.setValueAtTime(v.f, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, v.to), t + v.d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v.gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + v.d);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + v.d + 0.02);
  }
}

import { DUEL_QUESTIONS, QUERY_TASKS, TIER_META, type GameKind, type Question, type QueryTask } from "@/content";

const shuffle = <T,>(arr: T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// ── clause duel deck ────────────────────────────────────────────────────────

export function buildDeck(dbId: string, tier: 1 | 2 | 3, rounds?: number): Question[] {
  const n = rounds ?? TIER_META[tier].rounds;
  const pool = DUEL_QUESTIONS.filter((x) => x.db === dbId);
  const scored = pool.map((x) => {
    const w = x.tier === tier ? 3 : Math.abs(x.tier - tier) === 1 ? 1.7 : 0.6;
    return { x, k: Math.random() / w };
  });
  scored.sort((a, b) => a.k - b.k);
  return scored.slice(0, Math.min(n, scored.length)).map((s) => s.x);
}

export function dealHand(q: Question): string[] {
  return shuffle(q.options).slice(0, 5);
}

export function isCorrect(q: Question, played: (string | null)[]): boolean {
  if (played.length !== q.answer.length) return false;
  return played.every((p, i) => p === q.answer[i]);
}

export const critThreshold = (limit: number) => limit * 0.3;

export function scoreFor(ms: number, limit: number, combo: number, crit: boolean) {
  const speed = Math.round(150 * Math.max(0, Math.min(1, 1 - ms / limit)));
  const mult = 1 + 0.2 * Math.min(combo, 5);
  return Math.round((110 + speed) * mult) + (crit ? 90 : 0);
}

// ── full-statement deck (builder + rapid) ──────────────────────────────────
/** chosen database first at the chosen tier, then sister databases at the same tier */
export function buildQueryDeck(dbId: string, tier: 1 | 2 | 3, rounds: number): QueryTask[] {
  const home = shuffle(QUERY_TASKS.filter((x) => x.db === dbId && x.tier === tier));
  const away = shuffle(QUERY_TASKS.filter((x) => x.db !== dbId && x.tier === tier));
  return [...home, ...away].slice(0, rounds);
}

export function trayFor(task: QueryTask): string[] {
  return shuffle([...task.blocks, ...task.decoys]);
}

export const multOf = (combo: number) => 1 + 0.2 * Math.min(combo, 5);

export function queryScore(kind: "builder" | "rapid", ms: number, limit: number, combo: number, misses = 0) {
  const base = kind === "builder" ? 200 : 250;
  const speedMax = kind === "builder" ? 200 : 250;
  const speed = Math.round(speedMax * Math.max(0, Math.min(1, 1 - ms / limit)));
  const crit = ms < critThreshold(limit);
  const pts = Math.round((base + speed) * multOf(combo)) + (crit ? 120 : 0) - misses * 40;
  return { points: Math.max(60, pts), crit };
}

// ── cpu opponent ────────────────────────────────────────────────────────────

const CPU = [
  { think: 0.68, acc: 0.7 },
  { think: 0.46, acc: 0.86 },
  { think: 0.33, acc: 0.95 },
] as const;

export function cpuPlan(tier: 1 | 2 | 3, limit: number) {
  const c = CPU[tier - 1];
  const ms = Math.round(limit * c.think * (0.78 + Math.random() * 0.44));
  return { ms: Math.min(ms, limit - 350), correct: Math.random() < c.acc };
}

export function cpuCards(q: Question, hand: string[], correct: boolean): string[] {
  if (correct) return [...q.answer];
  const wrong = hand.filter((h) => !q.answer.includes(h));
  return q.answer.map(() => wrong[Math.floor(Math.random() * wrong.length)]);
}

// ── local high score table ──────────────────────────────────────────────────

export type ScoreRow = {
  name: string;
  score: number;
  tier: number;
  db: string;
  mode: string;
  game?: GameKind;
  accuracy: number;
  date: number;
};

const KEY = "qc.highscores.v1";

export function loadScores(): ScoreRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw) as ScoreRow[];
    return Array.isArray(rows) ? rows.sort((a, b) => b.score - a.score) : [];
  } catch {
    return [];
  }
}

export function saveScore(row: ScoreRow): ScoreRow[] {
  const rows = [...loadScores(), row].sort((a, b) => b.score - a.score).slice(0, 60);
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* storage full or blocked */
  }
  return rows;
}

export const MEDAL = ["#FFB627", "#C9D4DC", "#A4552F"];

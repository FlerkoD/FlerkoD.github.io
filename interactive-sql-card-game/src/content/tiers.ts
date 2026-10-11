import type { QueryTask } from "./types";

export type Tier = 1 | 2 | 3;

/** Clause duel — per-round clock, deck length and damage */
export const TIER_META: Record<number, { limit: number; rounds: number; damage: number }> = {
  1: { limit: 12000, rounds: 6, damage: 14 },
  2: { limit: 9000, rounds: 8, damage: 18 },
  3: { limit: 7000, rounds: 8, damage: 24 },
};

/** Query builder — per-query clock */
export const BUILDER_META: Record<number, { limit: number; rounds: number }> = {
  1: { limit: 60000, rounds: 6 },
  2: { limit: 50000, rounds: 6 },
  3: { limit: 45000, rounds: 6 },
};

/** Rapid query — budget scales with statement length */
export const RAPID_META: Record<
  number,
  { cps: number; think: number; lives: number; penalty: number; rounds: number; meter: "live" | "after" | "none" }
> = {
  1: { cps: 1.6, think: 9000, lives: 3, penalty: 2000, rounds: 6, meter: "live" },
  2: { cps: 2.2, think: 7000, lives: 3, penalty: 3000, rounds: 6, meter: "after" },
  3: { cps: 3.0, think: 5000, lives: 2, penalty: 4000, rounds: 6, meter: "none" },
};

export function rapidLimit(task: QueryTask, tier: number) {
  const m = RAPID_META[tier] ?? RAPID_META[2];
  const len = task.blocks.join(" ").length;
  return Math.ceil((m.think + (len / m.cps) * 1000) / 1000) * 1000;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DB_BY_ID, TIER_META, type Question } from "@/content";
import { buildDeck, cpuCards, cpuPlan, critThreshold, dealHand, isCorrect, scoreFor } from "@/game/engine";
import { burstEl, reducedMotion, shake } from "@/game/fx";
import { sfx } from "@/game/sfx";
import { tx, useI18n, type DictKey } from "@/i18n";
import { ClauseCard, HpBar, Legend } from "./ui";
import { ClockBar, ComboChip, Hand, QueryBoard } from "./board";
import { GameHeader, IntroFlash, PauseOverlay, TaskBand } from "./shared";
import GameOver, { type MatchStats } from "./GameOver";

type Side = {
  name: string;
  cpu: boolean;
  hp: number;
  score: number;
  combo: number;
  best: number;
  streak: number;
  correct: number;
  answered: number;
  filled: (string | null)[];
  done: boolean;
  ms: number;
  pickAt: number;
  pendingAt: number;
  plan: { ms: number; correct: boolean } | null;
};

type Reveal = {
  correct: boolean[];
  crit: boolean[];
  points: number[];
  damage: number[];
  ms: number[];
  winner: number | null;
  answers: (string | null)[][];
};

type MS = {
  deck: Question[];
  round: number;
  phase: "intro" | "play" | "reveal" | "over";
  hands: [string[], string[]];
  sides: [Side, Side];
  startedAt: number;
  deadline: number;
  revealUntil: number;
  introUntil: number;
  reveal: Reveal | null;
  stats: MatchStats | null;
};

function newRun(dbId: string, tier: number, mode: string): MS {
  const deck = buildDeck(dbId, tier as 1 | 2 | 3);
  const now = Date.now();
  const q = deck[0];
  const slots = q ? q.answer.length : 1;
  const mk = (name: string, cpu: boolean): Side => ({
    name, cpu, hp: 100, score: 0, combo: 0, best: 0, streak: 0, correct: 0, answered: 0,
    filled: Array(slots).fill(null), done: false, ms: 0, pickAt: 0, pendingAt: 0, plan: null,
  });
  return {
    deck,
    round: 0,
    phase: "intro",
    hands: [q ? dealHand(q) : [], q ? dealHand(q) : []],
    sides: [mk(mode === "local" ? "duel.p1" : "duel.you", false), mk(mode === "local" ? "duel.p2" : "AUTOMATON", mode !== "local")],
    startedAt: now,
    deadline: now,
    revealUntil: 0,
    introUntil: now + 1500,
    reveal: null,
    stats: null,
  };
}

type Props = { mode: "solo" | "local"; dbId: string; tier: number; onExit: () => void; onHelp?: () => void };

export default function Match(props: Props) {
  const [runId, setRunId] = useState(0);
  return <MatchRun key={runId} {...props} onRestart={() => setRunId((r) => r + 1)} />;
}

function MatchRun({ mode, dbId, tier, onExit, onHelp, onRestart }: Props & { onRestart: () => void }) {
  const { t, locale } = useI18n();
  const meta = TIER_META[tier];
  const db = DB_BY_ID[dbId];
  const ref = useRef<MS>(newRun(dbId, tier, mode));
  const [, force] = useState(0);
  const rerender = useCallback(() => force((n) => n + 1), []);
  const [paused, setPaused] = useState(false);
  const pausedAt = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = reducedMotion();
  }, []);

  const S = ref.current;
  const question = S.deck[S.round] ?? S.deck[0];

  const startPlay = useCallback(() => {
    const s = ref.current;
    const now = Date.now();
    s.phase = "play";
    s.startedAt = now;
    s.deadline = now + meta.limit;
    for (const side of s.sides) {
      side.done = false;
      side.ms = 0;
      side.pickAt = 0;
      side.pendingAt = 0;
      side.plan = side.cpu ? cpuPlan(tier as 1 | 2 | 3, meta.limit) : null;
    }
    rerender();
  }, [meta.limit, rerender, tier]);

  const submit = useCallback(
    (i: number) => {
      const s = ref.current;
      const side = s.sides[i];
      if (!s.deck[s.round] || side.done) return;
      side.done = true;
      side.ms = side.cpu ? (side.plan?.ms ?? meta.limit) : Math.min(meta.limit, Math.max(0, side.pickAt - s.startedAt));
      rerender();
    },
    [meta.limit, rerender],
  );

  const resolve = useCallback(() => {
    const s = ref.current;
    const q = s.deck[s.round];
    if (!q || s.phase !== "play") return;
    const correct = s.sides.map((side) => isCorrect(q, side.filled));
    const ms = s.sides.map((side) => (side.done ? side.ms : meta.limit));
    const crit = correct.map((c, i) => c && ms[i] < critThreshold(meta.limit));
    const points = correct.map((c, i) => (c ? scoreFor(ms[i], meta.limit, s.sides[i].combo, crit[i]) : 0));
    const damage = [0, 0];
    let winner: number | null = null;
    if (correct[0] || correct[1]) {
      winner = correct[0] && correct[1] ? (ms[0] <= ms[1] ? 0 : 1) : correct[0] ? 0 : 1;
      damage[1 - winner] = meta.damage + (crit[winner] ? 8 : 0) + Math.min(6, s.sides[winner].streak);
    } else {
      damage[0] = 6;
      damage[1] = 6;
    }
    s.sides.forEach((side, i) => {
      side.hp = Math.max(0, side.hp - damage[i]);
      side.score += points[i];
      side.answered += 1;
      if (correct[i]) {
        side.correct += 1;
        side.combo += 1;
        side.streak += 1;
        side.best = Math.max(side.best, side.combo);
      } else {
        side.combo = 0;
        side.streak = 0;
      }
    });
    s.reveal = { correct, crit, points, damage, ms, winner, answers: s.sides.map((x) => [...x.filled]) };
    s.phase = "reveal";
    s.revealUntil = Date.now() + 3300;

    if (!reduced.current) {
      if (winner != null) {
        burstEl(document.getElementById(`seat-${winner}`), {
          color: "#33E0D0", count: crit[winner] ? 78 : 42, angle: -Math.PI / 2, spread: Math.PI * 1.25,
          speed: crit[winner] ? 620 : 420, size: crit[winner] ? 4 : 3,
        });
        burstEl(document.getElementById(`seat-${1 - winner}`), { color: "#FF4D3D", count: 30, angle: -Math.PI / 2, spread: Math.PI * 1.6, speed: 300 });
        shake(9 + damage[1 - winner] * 0.7 + (crit[winner] ? 7 : 0));
      } else {
        burstEl(document.getElementById("qband"), { color: "#FF4D3D", count: 26, speed: 260 });
        shake(11);
      }
      if (crit[0] || crit[1]) burstEl(document.getElementById("qband"), { color: "#FFD27A", count: 34, speed: 520, size: 2.5 });
    }
    if (winner != null) sfx(crit[winner] ? "crit" : "good");
    else sfx("bad");
    sfx("hit");
    rerender();
  }, [meta.damage, meta.limit, rerender]);

  const advance = useCallback(() => {
    const s = ref.current;
    const dead = s.sides.some((x) => x.hp <= 0);
    if (dead || s.round + 1 >= s.deck.length) {
      const [a, b] = s.sides;
      const winner = a.hp === b.hp ? (a.score === b.score ? null : a.score > b.score ? 0 : 1) : a.hp > b.hp ? 0 : 1;
      s.stats = {
        score: a.score, correct: a.correct, answered: a.answered, bestCombo: a.best, streak: a.streak,
        round: s.round + 1, total: s.deck.length, hp: a.hp, foeHp: b.hp, winner,
      };
      s.phase = "over";
      sfx(winner === 0 ? "win" : "lose");
      rerender();
      return;
    }
    s.round += 1;
    const q = s.deck[s.round];
    s.hands = [dealHand(q), dealHand(q)];
    s.sides.forEach((x) => {
      x.filled = Array(q.answer.length).fill(null);
      x.done = false;
      x.plan = null;
    });
    s.reveal = null;
    s.phase = "intro";
    s.introUntil = Date.now() + 1300;
    rerender();
  }, [rerender]);

  useEffect(() => {
    const id = setInterval(() => {
      const s = ref.current;
      if (pausedAt.current) return;
      const now = Date.now();
      if (s.phase === "intro") {
        if (now >= s.introUntil) startPlay();
        return;
      }
      if (s.phase === "play") {
        s.sides.forEach((side, i) => {
          if (!side.done && side.plan && now - s.startedAt >= side.plan.ms) {
            side.filled = cpuCards(s.deck[s.round], s.hands[i], side.plan.correct);
            side.pickAt = now;
            submit(i);
          }
          if (!side.done && side.pendingAt && now >= side.pendingAt) submit(i);
        });
        if (s.sides.every((x) => x.done) || now >= s.deadline) resolve();
        return;
      }
      if (s.phase === "reveal" && now >= s.revealUntil) advance();
    }, 45);
    return () => clearInterval(id);
  }, [startPlay, submit, resolve, advance]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      const next = !p;
      const s = ref.current;
      if (next) pausedAt.current = Date.now();
      else if (pausedAt.current) {
        const delta = Date.now() - pausedAt.current;
        pausedAt.current = 0;
        s.deadline += delta;
        s.startedAt += delta;
        s.revealUntil += delta;
        s.introUntil += delta;
        s.sides.forEach((x) => {
          if (x.pendingAt) x.pendingAt += delta;
        });
      }
      return next;
    });
  }, []);

  const pick = useCallback(
    (seat: number, token: string) => {
      const s = ref.current;
      if (s.phase !== "play" || pausedAt.current) return;
      const side = s.sides[seat];
      if (side.done) return;
      let idx = side.filled.indexOf(null);
      if (idx === -1) idx = side.filled.length - 1;
      const dup = side.filled.indexOf(token);
      if (dup !== -1 && dup !== idx) side.filled[dup] = null;
      side.filled[idx] = token;
      side.pickAt = Date.now();
      sfx("card");
      if (side.filled.every((x) => x != null)) {
        side.pendingAt = Date.now() + 190;
        sfx("seat");
      }
      rerender();
    },
    [rerender],
  );

  const undo = useCallback(
    (seat: number) => {
      const s = ref.current;
      if (s.phase !== "play") return;
      const side = s.sides[seat];
      if (side.done) return;
      for (let i = side.filled.length - 1; i >= 0; i--) {
        if (side.filled[i] != null) {
          side.filled[i] = null;
          break;
        }
      }
      side.pendingAt = 0;
      rerender();
    },
    [rerender],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = ref.current;
      if (s.phase === "over") return;
      if (e.key === "Escape" || e.key.toLowerCase() === "p") {
        e.preventDefault();
        togglePause();
        return;
      }
      if (pausedAt.current) {
        if (e.key.toLowerCase() === "r") onRestart();
        return;
      }
      if (s.phase !== "play") return;
      const p1 = ["1", "2", "3", "4", "5"].indexOf(e.key);
      const p2 = mode === "local" ? ["6", "7", "8", "9", "0"].indexOf(e.key) : -1;
      if (p1 >= 0 || p2 >= 0) {
        e.preventDefault();
        const seat = p1 >= 0 ? 0 : 1;
        const tok = s.hands[seat][p1 >= 0 ? p1 : p2];
        if (tok) pick(seat, tok);
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        undo(s.sides[0].filled.some((x) => x != null) || mode !== "local" ? 0 : 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, pick, undo, togglePause, onRestart]);

  if (S.phase === "over" && S.stats) {
    return <GameOver stats={S.stats} mode={mode} game="duel" tier={tier} dbId={dbId} onRestart={onRestart} onHome={onExit} />;
  }

  const rv = S.reveal;
  const tierName = t(`tier.${tier}` as DictKey);
  const nm = (s: Side) => t(s.name as DictKey);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#131619]">
      <GameHeader
        info={`${db?.name} · ${tierName} · ${t(mode === "local" ? "duel.modeLocal" : "duel.modeSolo")}`}
        sub={tx(db?.tagline, locale)}
        score={S.sides[0].score}
        round={S.round + 1}
        total={S.deck.length}
        onExit={onExit}
        onPause={togglePause}
        paused={paused}
      />

      <TaskBand
        legend={t("duel.statement", { n: String(S.round + 1).padStart(2, "0") })}
        right={t("hud.blanks", { n: question.answer.length })}
        brief={tx(question.brief, locale)}
        footer={
          <div className="mt-3 min-h-[34px]">
            <AnimatePresence mode="wait">
              {rv ? (
                <motion.div
                  key={"why" + S.round}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.35 }}
                  className="flex items-start gap-3"
                >
                  <span
                    className="mt-[3px] shrink-0 rounded-[2px] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#EDE6D8]"
                    style={{ background: rv.winner === 0 ? "#0F8C82" : rv.winner === 1 ? "#9A5B2F" : "#46535D" }}
                  >
                    {t(rv.winner === 0 ? "duel.won" : rv.winner === 1 ? "duel.lost" : "duel.bothFailed")}
                  </span>
                  <p className="font-serif text-[15px] italic leading-snug text-[#8C9AA5] sm:text-[17px]">{tx(question.why, locale)}</p>
                </motion.div>
              ) : (
                <motion.p key={"hint" + S.round} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#5A6772]">
                  {t("duel.hint")}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        }
      >
        <div className="mt-4 rounded-[3px] border border-[#FFB627]/20 bg-[#131619]/80 px-4 py-4 sm:px-6">
          <QueryBoard question={question} filled={rv ? rv.answers[0] : S.sides[0].filled} reveal={!!rv} />
        </div>
      </TaskBand>

      <div className="grid grid-cols-2 items-start gap-3 px-3 py-3 sm:px-5 lg:grid-cols-[1fr_260px_1fr] lg:gap-6">
        <Seat id={0} side={S.sides[0]} label={nm(S.sides[0])} tone="#FFB627" align="left" reveal={rv} mine />
        <div className="order-last col-span-2 lg:order-none lg:col-span-1 lg:mt-1">
          <ClockBar limit={meta.limit} deadline={S.deadline} runId={S.round} paused={paused || S.phase !== "play"} />
          <div className="mt-2 flex items-center justify-center gap-2">
            <ComboChip combo={S.sides[0].combo} streak={S.sides[0].streak} />
          </div>
          {rv ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 380, damping: 18 }} className="mt-3 text-center">
              <div
                className="font-display text-[30px] font-bold leading-none sm:text-[34px]"
                style={{ color: rv.crit[0] ? "#FFD27A" : rv.winner === 0 ? "#33E0D0" : "#FF4D3D" }}
              >
                {t(rv.crit[0] ? "duel.optimized" : rv.winner === 0 ? "duel.executed" : rv.winner == null ? "duel.rollback" : "duel.rejected")}
              </div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#5A6772]">
                {rv.points[0] > 0 ? t("duel.pts", { n: rv.points[0] }) : t("duel.noRows")}
                {rv.damage[1] > 0 ? t("duel.foeDmg", { n: rv.damage[1] }) : ""}
              </div>
            </motion.div>
          ) : null}
        </div>
        <Seat id={1} side={S.sides[1]} label={nm(S.sides[1])} tone="#8C9AA5" align="right" reveal={rv} mine={mode === "local"} />
      </div>

      <div className="mt-auto border-t border-[#272D34] bg-[#0E1114] px-3 py-3 sm:px-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          {mode === "local" ? (
            <>
              <Hand cards={S.hands[1]} filled={S.sides[1].filled} onPick={(tk) => pick(1, tk)} disabled={S.sides[1].done || S.phase !== "play"} labels={["6", "7", "8", "9", "0"]} label={t("duel.handP2")} tone="cyan" compact />
              <Hand cards={S.hands[0]} filled={S.sides[0].filled} onPick={(tk) => pick(0, tk)} disabled={S.sides[0].done || S.phase !== "play"} labels={["1", "2", "3", "4", "5"]} label={t("duel.handP1")} tone="amber" compact />
            </>
          ) : (
            <Hand cards={S.hands[0]} filled={S.sides[0].filled} onPick={(tk) => pick(0, tk)} disabled={S.sides[0].done || S.phase !== "play"} label={t("duel.handYou")} tone="amber" />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-[env(safe-area-inset-bottom)]">
            <Legend>{t(mode === "local" ? "duel.keysLocal" : "duel.keysSolo")}</Legend>
            <Legend>{t("duel.keysPause")}</Legend>
          </div>
        </div>
      </div>

      <IntroFlash show={S.phase === "intro" && !paused} label={S.round === 0 ? t("hud.ready") : t("hud.roundN", { n: S.round + 1 })} sub={`${db?.name} // ${tierName}`} />
      <PauseOverlay open={paused} onResume={togglePause} onRestart={onRestart} onExit={onExit} onHelp={onHelp} />
    </div>
  );
}

function Seat({ id, side, label, tone, align, reveal, mine }: { id: number; side: Side; label: string; tone: string; align: "left" | "right"; reveal: Reveal | null; mine: boolean }) {
  const { t } = useI18n();
  const dmg = reveal?.damage[id] ?? 0;
  return (
    <motion.div
      id={`seat-${id}`}
      animate={reveal && dmg > 0 ? { x: [0, align === "left" ? -8 : 8, 0], opacity: [1, 0.6, 1] } : {}}
      transition={{ duration: 0.35 }}
      className={`min-w-0 ${align === "right" ? "text-right" : ""}`}
    >
      <HpBar hp={side.hp} label={`${label}${side.cpu ? ` // ${t("duel.cpu")}` : ""}${reveal && dmg ? `  −${dmg}` : ""}`} tone={tone} align={align} />
      <div className={`mt-2 flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#5A6772]">{t(mine ? "duel.yourSeat" : "duel.opponent")}</span>
        {side.done ? (
          <span className="rounded-[2px] bg-[#0F8C82]/25 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#33E0D0]">
            {t("duel.submitted")} {side.cpu ? "" : `${(side.ms / 1000).toFixed(2)}s`}
          </span>
        ) : null}
      </div>
      <div className={`mt-2 flex gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {side.filled.map((f, i) => (
          <div key={i} className="max-w-[120px] flex-1">
            <ClauseCard token={f ?? "—"} state={f ? (reveal ? "reveal" : "picked") : "spent"} small showGloss={false} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

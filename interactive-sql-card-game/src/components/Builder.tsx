"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BUILDER_META, DB_BY_ID, type QueryTask } from "@/content";
import { buildQueryDeck, queryScore, trayFor } from "@/game/engine";
import { burstEl, shake } from "@/game/fx";
import { sfx } from "@/game/sfx";
import { tx, useI18n, type DictKey } from "@/i18n";
import { BlockChip, Btn, Icon, Legend } from "./ui";
import { ClockBar, ComboChip } from "./board";
import { GameHeader, IntroFlash, PauseOverlay, SchemaPanel, TaskBand } from "./shared";
import RoundEndOverlay, { type RoundOutcome } from "./RoundEndOverlay";
import GameOver, { type MatchStats } from "./GameOver";

type Tile = { id: number; text: string };
type Props = { dbId: string; tier: number; onExit: () => void; onHelp?: () => void };

export default function Builder(props: Props) {
  const [run, setRun] = useState(0);
  return <BuilderRun key={run} {...props} onRestart={() => setRun((r) => r + 1)} />;
}

function BuilderRun({ dbId, tier, onExit, onHelp, onRestart }: Props & { onRestart: () => void }) {
  const { t, locale } = useI18n();
  const meta = BUILDER_META[tier];
  const [deck] = useState<QueryTask[]>(() => buildQueryDeck(dbId, tier as 1 | 2 | 3, meta.rounds));
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"intro" | "play" | "end" | "over">("intro");
  const [tray, setTray] = useState<Tile[]>(() => (deck[0] ? trayFor(deck[0]).map((text, id) => ({ id, text })) : []));
  const [placed, setPlaced] = useState<number[]>([]);
  const [focus, setFocus] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [stats, setStats] = useState({ score: 0, combo: 0, best: 0, correct: 0, answered: 0 });
  const [final, setFinal] = useState<MatchStats | null>(null);
  const startedAt = useRef(0);
  const pausedAt = useRef(0);
  const introUntil = useRef(Date.now() + 1300);
  const doneRef = useRef(false);

  const task = deck[round];
  const db = DB_BY_ID[task?.db ?? dbId];
  const byId = (id: number) => tray.find((x) => x.id === id)?.text ?? "";
  const available = tray.filter((x) => !placed.includes(x.id));

  const beginRound = useCallback(() => {
    const now = Date.now();
    startedAt.current = now;
    doneRef.current = false;
    setDeadline(now + meta.limit);
    setPhase("play");
  }, [meta.limit]);

  const finish = useCallback(
    (kind: "submit" | "timeout") => {
      if (!task || doneRef.current) return;
      doneRef.current = true;
      const ms = Math.min(meta.limit, Date.now() - startedAt.current);
      const yours = placed.map(byId);
      const ok = kind === "submit" && yours.length === task.blocks.length && yours.every((b, i) => b === task.blocks[i]);
      const marks = yours.map((b, i) => b === task.blocks[i]);
      const { points, crit } = ok ? queryScore("builder", ms, meta.limit, stats.combo) : { points: 0, crit: false };
      const combo = ok ? stats.combo + 1 : 0;
      setStats((s) => ({
        score: s.score + points,
        combo,
        best: Math.max(s.best, combo),
        correct: s.correct + (ok ? 1 : 0),
        answered: s.answered + 1,
      }));
      setOutcome({ kind: ok ? "accepted" : kind === "timeout" ? "timeout" : "rejected", yours, marks, points, ms, combo, crit });
      setPhase("end");
      const line = document.getElementById("assembly");
      if (ok) {
        sfx(crit ? "crit" : "good");
        burstEl(line, { color: crit ? "#FFD27A" : "#33E0D0", count: crit ? 80 : 50, speed: crit ? 600 : 420, angle: -Math.PI / 2, spread: Math.PI * 1.4 });
        shake(crit ? 12 : 6);
      } else {
        sfx("bad");
        sfx("hit");
        burstEl(line, { color: "#FF4D3D", count: 34, speed: 300 });
        shake(15);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [task, placed, tray, stats.combo, meta.limit],
  );

  const next = useCallback(() => {
    if (round + 1 >= deck.length) {
      setFinal({
        score: stats.score, correct: stats.correct, answered: stats.answered, bestCombo: stats.best, streak: stats.combo,
        round: round + 1, total: deck.length, hp: 0, foeHp: 0, winner: stats.correct === deck.length ? 0 : null,
      });
      sfx(stats.correct >= deck.length / 2 ? "win" : "lose");
      setPhase("over");
      return;
    }
    const r = round + 1;
    setRound(r);
    setTray(trayFor(deck[r]).map((text, id) => ({ id, text })));
    setPlaced([]);
    setFocus(0);
    setOutcome(null);
    introUntil.current = Date.now() + 1000;
    setPhase("intro");
  }, [round, deck, stats]);

  // loop: intro → play, clock expiry
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedAt.current) return;
      if (phase === "intro" && Date.now() >= introUntil.current) beginRound();
      if (phase === "play" && Date.now() >= deadline) finish("timeout");
    }, 60);
    return () => clearInterval(id);
  }, [phase, deadline, beginRound, finish]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (!p) pausedAt.current = Date.now();
      else if (pausedAt.current) {
        const d = Date.now() - pausedAt.current;
        pausedAt.current = 0;
        startedAt.current += d;
        introUntil.current += d;
        setDeadline((x) => x + d);
      }
      return !p;
    });
  }, []);

  const place = useCallback(
    (id: number) => {
      if (phase !== "play" || pausedAt.current || placed.includes(id)) return;
      setPlaced((p) => [...p, id]);
      sfx("card");
      requestAnimationFrame(() => burstEl(document.getElementById("line-caret"), { color: "#FFB627", count: 10, speed: 180, size: 2, gravity: 200 }));
    },
    [phase, placed],
  );
  const pull = useCallback(
    (id?: number) => {
      if (phase !== "play") return;
      setPlaced((p) => (id === undefined ? p.slice(0, -1) : p.filter((x) => x !== id)));
      sfx("seat");
    },
    [phase],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "over" || phase === "end") return;
      if (e.key === "Escape" || e.key.toLowerCase() === "p") {
        e.preventDefault();
        togglePause();
        return;
      }
      if (pausedAt.current) {
        if (e.key.toLowerCase() === "r") onRestart();
        return;
      }
      if (phase !== "play") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocus((f) => Math.min(available.length - 1, f + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocus((f) => Math.max(0, f - 1));
      } else if (e.key === " ") {
        e.preventDefault();
        const tile = available[Math.min(focus, available.length - 1)];
        if (tile) place(tile.id);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        pull();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (placed.length) finish("submit");
      } else if (/^[1-9]$/.test(e.key)) {
        const tile = tray[Number(e.key) - 1];
        if (tile && !placed.includes(tile.id)) {
          e.preventDefault();
          place(tile.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, available, focus, tray, placed, place, pull, finish, togglePause, onRestart]);

  useEffect(() => {
    if (focus > available.length - 1) setFocus(Math.max(0, available.length - 1));
  }, [available.length, focus]);

  if (phase === "over" && final) {
    return <GameOver stats={final} mode="solo" game="builder" tier={tier} dbId={dbId} onRestart={onRestart} onHome={onExit} />;
  }
  if (!task) return null;

  const tierName = t(`tier.${tier}` as DictKey);
  const focusedId = available[Math.min(focus, available.length - 1)]?.id;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#131619]">
      <GameHeader
        info={`${t("game.builder")} · ${tierName}`}
        sub={`${db?.name} — ${tx(db?.tagline, locale)}`}
        score={stats.score}
        round={round + 1}
        total={deck.length}
        onExit={onExit}
        onPause={togglePause}
        paused={paused}
      />

      <TaskBand legend={t("build.legend", { n: String(round + 1).padStart(2, "0") })} right={db?.name} brief={tx(task.brief, locale)}>
        <div id="assembly" className="mt-4 rounded-[3px] border border-[#FFB627]/25 bg-[#131619]/85 px-3 py-3 sm:px-5 sm:py-4">
          <div className="mb-2 flex items-center justify-between">
            <Legend tone="amber">{t("build.line")}</Legend>
            <Legend>{placed.length} / {task.blocks.length}</Legend>
          </div>
          <div className="flex min-h-[46px] flex-wrap items-center gap-1.5">
            <AnimatePresence initial={false}>
              {placed.map((id) => (
                <motion.span
                  key={id}
                  layout
                  initial={{ scale: 0.6, y: 14, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.12 } }}
                  transition={{ type: "spring", stiffness: 600, damping: 24 }}
                >
                  <BlockChip text={byId(id)} placed onClick={() => pull(id)} />
                </motion.span>
              ))}
            </AnimatePresence>
            <span id="line-caret" className="inline-block h-[26px] w-[10px] animate-pulse rounded-[1px] bg-[#FFB627]/70" aria-hidden />
            {placed.length === 0 ? <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5A6772]">{t("build.empty")}</span> : null}
          </div>
        </div>
      </TaskBand>

      <div className="grid flex-1 gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
            <ClockBar limit={meta.limit} deadline={deadline} runId={round} paused={paused || phase !== "play"} />
            <ComboChip combo={stats.combo} streak={stats.combo} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Legend tone="amber">{t("build.tray")}</Legend>
              <Legend>{t("build.decoys", { n: task.decoys.length })}</Legend>
            </div>
            <div className="flex flex-wrap gap-2 rounded-[3px] border border-[#272D34] bg-[#0E1114] p-3">
              {tray.map((tile, i) => {
                const used = placed.includes(tile.id);
                return (
                  <BlockChip
                    key={tile.id}
                    text={tile.text}
                    index={i}
                    focused={!used && tile.id === focusedId}
                    state={used ? "ghost" : "idle"}
                    onClick={used ? undefined : () => place(tile.id)}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pb-[env(safe-area-inset-bottom)]">
            <Btn tone="amber" onClick={() => placed.length && finish("submit")} disabled={!placed.length || phase !== "play"} kbd="ENTER">
              <Icon name="bolt" size={15} /> {t("build.execute")}
            </Btn>
            <Btn tone="steel" onClick={() => pull()} disabled={!placed.length || phase !== "play"}>
              <Icon name="undo" size={15} /> {t("build.undo")}
            </Btn>
            <Btn tone="ghost" onClick={() => setPlaced([])} disabled={!placed.length || phase !== "play"}>
              <Icon name="trash" size={15} /> {t("build.clear")}
            </Btn>
            <Btn tone="ghost" className="lg:hidden" onClick={() => setShowSchema((s) => !s)}>
              <Icon name="db" size={15} /> {t(showSchema ? "hud.hideSchema" : "hud.showSchema")}
            </Btn>
          </div>
          <Legend className="hidden sm:block">{t("build.keys")}</Legend>
        </div>

        <aside className={`${showSchema ? "block" : "hidden"} lg:block`}>
          <Legend>{t("hud.schema", { db: db?.name ?? "" })}</Legend>
          <div className="mt-2">{db ? <SchemaPanel db={db} dense /> : null}</div>
        </aside>
      </div>

      <IntroFlash show={phase === "intro" && !paused} label={round === 0 ? t("hud.ready") : t("hud.roundN", { n: round + 1 })} sub={`${db?.name} // ${tierName}`} />
      <AnimatePresence>
        {phase === "end" && outcome ? <RoundEndOverlay task={task} outcome={outcome} last={round + 1 >= deck.length} onNext={next} /> : null}
      </AnimatePresence>
      <PauseOverlay open={paused} onResume={togglePause} onRestart={onRestart} onExit={onExit} onHelp={onHelp} />
    </div>
  );
}

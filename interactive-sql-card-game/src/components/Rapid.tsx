"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DB_BY_ID, RAPID_META, rapidLimit, type QueryTask } from "@/content";
import { buildQueryDeck, queryScore } from "@/game/engine";
import { checkQuery, liveProgress } from "@/game/sql";
import { burstEl, shake } from "@/game/fx";
import { sfx } from "@/game/sfx";
import { tx, useI18n, type DictKey } from "@/i18n";
import { Btn, Icon, Legend } from "./ui";
import { ClockBar, ComboChip } from "./board";
import { GameHeader, IntroFlash, PauseOverlay, SchemaPanel, TaskBand } from "./shared";
import RoundEndOverlay, { type RoundOutcome } from "./RoundEndOverlay";
import GameOver, { type MatchStats } from "./GameOver";

type Props = { dbId: string; tier: number; onExit: () => void; onHelp?: () => void };

const QUICK = ["SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "JOIN", "LEFT JOIN", "ON", "COUNT(*)", "AVG(", "SUM(", "DISTINCT", "IS NULL", "DESC", "LIMIT", "AND", "=", ">", "<", ",", "(", ")", "'"];

export default function Rapid(props: Props) {
  const [run, setRun] = useState(0);
  return <RapidRun key={run} {...props} onRestart={() => setRun((r) => r + 1)} />;
}

function RapidRun({ dbId, tier, onExit, onHelp, onRestart }: Props & { onRestart: () => void }) {
  const { t, locale } = useI18n();
  const meta = RAPID_META[tier];
  const [deck] = useState<QueryTask[]>(() => buildQueryDeck(dbId, tier as 1 | 2 | 3, meta.rounds));
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"intro" | "play" | "end" | "over">("intro");
  const [text, setText] = useState("");
  const [deadline, setDeadline] = useState(0);
  const [limit, setLimit] = useState(() => (deck[0] ? rapidLimit(deck[0], tier) : 30000));
  const [lives, setLives] = useState(meta.lives);
  const [attempts, setAttempts] = useState(0);
  const [flash, setFlash] = useState<{ msg: string; pen: number; key: number } | null>(null);
  const [meterAfter, setMeterAfter] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [stats, setStats] = useState({ score: 0, combo: 0, best: 0, correct: 0, answered: 0 });
  const [final, setFinal] = useState<MatchStats | null>(null);
  const startedAt = useRef(0);
  const pausedAt = useRef(0);
  const introUntil = useRef(Date.now() + 1300);
  const doneRef = useRef(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const task = deck[round];
  const db = DB_BY_ID[task?.db ?? dbId];
  const refs = useMemo(() => (task ? [task.blocks.join(" "), ...(task.alts ?? [])] : []), [task]);
  const live = useMemo(() => (task && meta.meter === "live" ? liveProgress(text, refs[0]) : null), [text, refs, task, meta.meter]);

  const beginRound = useCallback(() => {
    const now = Date.now();
    startedAt.current = now;
    doneRef.current = false;
    setDeadline(now + limit);
    setPhase("play");
    requestAnimationFrame(() => taRef.current?.focus());
  }, [limit]);

  const endRound = useCallback(
    (ok: boolean) => {
      if (!task || doneRef.current) return;
      doneRef.current = true;
      const ms = Math.min(limit, Date.now() - startedAt.current);
      const { points, crit } = ok ? queryScore("rapid", ms, limit, stats.combo, attempts) : { points: 0, crit: false };
      const combo = ok ? stats.combo + 1 : 0;
      setStats((s) => ({ score: s.score + points, combo, best: Math.max(s.best, combo), correct: s.correct + (ok ? 1 : 0), answered: s.answered + 1 }));
      if (!ok) setLives((l) => l - 1);
      setOutcome({ kind: ok ? "accepted" : "timeout", yours: [text], points, ms, combo, crit, lifeLost: !ok });
      setPhase("end");
      const band = document.getElementById("crt");
      if (ok) {
        sfx(crit ? "crit" : "good");
        burstEl(band, { color: crit ? "#FFD27A" : "#33E0D0", count: crit ? 84 : 52, speed: crit ? 620 : 440, angle: -Math.PI / 2, spread: Math.PI * 1.3 });
        shake(crit ? 12 : 6);
      } else {
        sfx("lose");
        burstEl(band, { color: "#FF4D3D", count: 40, speed: 320 });
        shake(18);
      }
    },
    [task, limit, stats.combo, attempts, text],
  );

  const submit = useCallback(() => {
    if (phase !== "play" || pausedAt.current || !task || !text.trim()) return;
    const rep = checkQuery(text, refs);
    if (rep.ok) {
      endRound(true);
      return;
    }
    setAttempts((a) => a + 1);
    setStats((s) => ({ ...s, combo: 0 }));
    setDeadline((d) => d - meta.penalty);
    const msg =
      tier === 3 ? t("rapid.rejected") : rep.near ? t("rapid.mismatch", { tok: rep.near }) : t("rapid.mismatchEnd");
    setFlash({ msg, pen: meta.penalty / 1000, key: Date.now() });
    if (meta.meter !== "none") setMeterAfter(rep.prefix / rep.total);
    sfx("bad");
    shake(10);
    burstEl(document.getElementById("crt"), { color: "#FF4D3D", count: 18, speed: 220, size: 2.4 });
  }, [phase, task, text, refs, endRound, meta.penalty, meta.meter, tier, t]);

  const next = useCallback(() => {
    const dead = lives <= 0;
    if (dead || round + 1 >= deck.length) {
      setFinal({
        score: stats.score, correct: stats.correct, answered: stats.answered, bestCombo: stats.best, streak: stats.combo,
        round: round + 1, total: deck.length, hp: lives, foeHp: 0,
        winner: dead ? 1 : stats.correct === deck.length ? 0 : null,
      });
      sfx(dead ? "lose" : "win");
      setPhase("over");
      return;
    }
    const r = round + 1;
    setRound(r);
    setLimit(rapidLimit(deck[r], tier));
    setText("");
    setAttempts(0);
    setFlash(null);
    setMeterAfter(null);
    setOutcome(null);
    introUntil.current = Date.now() + 1000;
    setPhase("intro");
  }, [lives, round, deck, stats, tier]);

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedAt.current) return;
      if (phase === "intro" && Date.now() >= introUntil.current) beginRound();
      if (phase === "play" && Date.now() >= deadline) endRound(false);
    }, 60);
    return () => clearInterval(id);
  }, [phase, deadline, beginRound, endRound]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (!p) pausedAt.current = Date.now();
      else if (pausedAt.current) {
        const d = Date.now() - pausedAt.current;
        pausedAt.current = 0;
        startedAt.current += d;
        introUntil.current += d;
        setDeadline((x) => x + d);
        requestAnimationFrame(() => taRef.current?.focus());
      }
      return !p;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === "over" || phase === "end") return;
      if (e.key === "Escape") {
        e.preventDefault();
        togglePause();
        return;
      }
      if (pausedAt.current && e.key.toLowerCase() === "r" && document.activeElement !== taRef.current) onRestart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, togglePause, onRestart]);

  const insert = (tok: string) => {
    const ta = taRef.current;
    if (!ta || phase !== "play") return;
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const tight = /^[,()']$/.test(tok) || tok.endsWith("(");
    const pad = before && !/\s$/.test(before) && !tight && !before.endsWith("(") ? " " : "";
    const after = tight ? "" : " ";
    const ins = pad + tok + after;
    const nv = before + ins + text.slice(end);
    setText(nv);
    sfx("tick");
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + ins.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  if (phase === "over" && final) {
    return <GameOver stats={final} mode="solo" game="rapid" tier={tier} dbId={dbId} onRestart={onRestart} onHome={onExit} />;
  }
  if (!task) return null;

  const tierName = t(`tier.${tier}` as DictKey);
  const meterPct = meta.meter === "live" && live ? live.prefix / live.total : meterAfter;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#131619]">
      <GameHeader
        info={`${t("game.rapid")} · ${tierName}`}
        sub={`${db?.name} — ${tx(db?.tagline, locale)}`}
        score={stats.score}
        round={round + 1}
        total={deck.length}
        onExit={onExit}
        onPause={togglePause}
        paused={paused}
        extra={
          <div className="text-right">
            <Legend>{t("hud.lives")}</Legend>
            <div className="mt-0.5 flex justify-end gap-1">
              {Array.from({ length: meta.lives }).map((_, i) => (
                <motion.span
                  key={i}
                  animate={i >= lives ? { scale: [1, 1.5, 0.8], opacity: 0.25 } : { scale: 1, opacity: 1 }}
                  className={`block h-[14px] w-[10px] rounded-[1px] ${i < lives ? "bg-[#FFB627] shadow-[0_0_8px_#FFB627]" : "bg-[#3C454E]"}`}
                />
              ))}
            </div>
          </div>
        }
      />

      <TaskBand
        legend={t("rapid.legend", { n: String(round + 1).padStart(2, "0") })}
        right={`${db?.name} · ${t("rapid.budget", { s: Math.round(limit / 1000) })}`}
        brief={tx(task.brief, locale)}
      >
        <div
          id="crt"
          className="relative mt-4 overflow-hidden rounded-[3px] border border-[#FFB627]/30 bg-[#0B0D0F] shadow-[inset_0_0_40px_rgba(255,182,39,0.08)]"
        >
          <div className="flex items-center justify-between border-b border-[#FFB627]/15 px-3 py-1.5">
            <Legend tone="amber">psql&gt; {db?.id}</Legend>
            <Legend>{t("rapid.attempts", { n: attempts })}</Legend>
          </div>
          <textarea
            ref={taRef}
            value={text}
            disabled={phase !== "play" || paused}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            rows={3}
            placeholder={t("rapid.placeholder")}
            className="block min-h-[108px] w-full resize-none bg-transparent px-3 py-3 font-mono text-[16px] font-medium leading-relaxed text-[#FFD27A] caret-[#FFB627] outline-none placeholder:text-[#FFB627]/25 disabled:opacity-60 sm:px-4 sm:text-[19px]"
            style={{ textShadow: "0 0 10px rgba(255,182,39,0.35)" }}
          />
          <AnimatePresence>
            {flash ? (
              <motion.div
                key={flash.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap items-center gap-3 border-t border-[#FF4D3D]/40 bg-[#FF4D3D]/10 px-3 py-2"
              >
                <Icon name="x" size={14} className="text-[#FF4D3D]" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#FF8A7E]">{flash.msg}</span>
                <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#FF4D3D]">{t("rapid.penalty", { n: flash.pen })}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        {meterPct != null ? (
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <Legend tone="cyan">{t("rapid.meter")}</Legend>
              <span className="font-mono text-[11px] font-bold tabular-nums text-[#33E0D0]">{Math.round(meterPct * 100)}%</span>
            </div>
            <div className="mt-1 h-[5px] overflow-hidden rounded-[1px] border border-[#333B44] bg-[#0E1114]">
              <div
                className="h-full transition-[width] duration-200 ease-out"
                style={{ width: `${meterPct * 100}%`, background: live?.wrongTail ? "#FF4D3D" : "#33E0D0", boxShadow: "0 0 10px #33E0D088" }}
              />
            </div>
          </div>
        ) : null}
      </TaskBand>

      <div className="grid flex-1 gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
            <ClockBar limit={limit} deadline={deadline} runId={round * 1000 + attempts} paused={paused || phase !== "play"} />
            <ComboChip combo={stats.combo} streak={stats.combo} />
          </div>
          <div>
            <Legend>{t("rapid.quick")}</Legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK.map((k) => (
                <button
                  key={k}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(k)}
                  disabled={phase !== "play"}
                  className="rounded-[2px] border border-[#333B44] bg-[#1C2126] px-2.5 py-2 font-mono text-[12px] font-bold text-[#E6EDF2] transition-all hover:border-[#FFB627] hover:text-[#FFB627] active:translate-y-[1px] disabled:opacity-40"
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-[env(safe-area-inset-bottom)]">
            <Btn tone="amber" onClick={submit} disabled={phase !== "play" || !text.trim()} kbd="ENTER">
              <Icon name="bolt" size={15} /> {t("rapid.execute")}
            </Btn>
            <Btn tone="ghost" className="lg:hidden" onClick={() => setShowSchema((s) => !s)}>
              <Icon name="db" size={15} /> {t(showSchema ? "hud.hideSchema" : "hud.showSchema")}
            </Btn>
          </div>
          <Legend className="hidden sm:block">{t("rapid.keys")}</Legend>
        </div>
        <aside className={`${showSchema ? "block" : "hidden"} lg:block`}>
          <Legend>{t("hud.schema", { db: db?.name ?? "" })}</Legend>
          <div className="mt-2">{db ? <SchemaPanel db={db} dense /> : null}</div>
        </aside>
      </div>

      <IntroFlash show={phase === "intro" && !paused} label={round === 0 ? t("hud.ready") : t("hud.roundN", { n: round + 1 })} sub={`${db?.name} // ${tierName}`} />
      <AnimatePresence>
        {phase === "end" && outcome ? (
          <RoundEndOverlay task={task} outcome={outcome} typed last={round + 1 >= deck.length || lives <= 0} onNext={next} />
        ) : null}
      </AnimatePresence>
      <PauseOverlay open={paused} onResume={togglePause} onRestart={onRestart} onExit={onExit} onHelp={onHelp} />
    </div>
  );
}

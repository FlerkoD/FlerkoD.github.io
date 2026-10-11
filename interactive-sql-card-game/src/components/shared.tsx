"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { TrainingDb } from "@/content";
import { tx, useI18n } from "@/i18n";
import { Btn, Icon, Legend, Panel } from "./ui";

/* ── compact relation schema, printed on card stock ─────────────────────── */
export function SchemaPanel({ db, dense }: { db: TrainingDb; dense?: boolean }) {
  const { t, locale } = useI18n();
  return (
    <div
      style={{ backgroundImage: "url(images/cardstock.jpg)", backgroundSize: "cover" }}
      className="relative rounded-[4px] bg-[#EDE6D8] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.55)]"
    >
      <span aria-hidden className="absolute inset-0 rounded-[4px] bg-[#EDE6D8]/72" />
      <div className="relative">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#1A1714]">{db.name}</span>
          <span className="truncate font-mono text-[8px] uppercase tracking-[0.14em] text-[#1A1714]/50">
            {tx(db.tagline, locale)}
          </span>
        </div>
        <div className={`mt-2 grid gap-1 ${dense ? "grid-cols-1" : "sm:grid-cols-2"}`}>
          {db.tables.map((tb) => (
            <div key={tb.name} className="rounded-[2px] border border-[#1A1714]/15 bg-[#1A1714]/[0.04] px-2 py-1.5">
              <div className="font-mono text-[10px] font-bold text-[#9A5B2F]">
                ▤ {tb.name}
                <span className="ml-1 font-normal text-[#1A1714]/45">
                  {tb.rows.toLocaleString()}
                  {t("rows")}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-1.5 font-mono text-[9px] leading-[1.55] text-[#1A1714]/70">
                {tb.columns.map((c) => (
                  <span key={c.name} className={c.key === "pk" ? "font-bold text-[#1A1714]" : c.key === "fk" ? "text-[#0F8C82]" : ""}>
                    {c.key === "pk" ? "#" : c.key === "fk" ? "→" : ""}
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── console header used by every in-game screen ────────────────────────── */
export function GameHeader({
  info,
  sub,
  score,
  round,
  total,
  onExit,
  onPause,
  paused,
  extra,
}: {
  info: string;
  sub?: string;
  score: number;
  round: number;
  total: number;
  onExit: () => void;
  onPause?: () => void;
  paused?: boolean;
  extra?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <header className="flex items-center gap-3 border-b border-[#272D34] bg-[#0E1114] px-3 py-2.5 sm:px-5">
      <button
        onClick={onExit}
        className="rounded-[2px] border border-[#333B44] p-1.5 text-[#8C9AA5] transition-colors hover:border-[#FFB627] hover:text-[#FFB627]"
        title={t("hud.back")}
      >
        <Icon name="home" size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <Legend>{info}</Legend>
        {sub ? <div className="mt-0.5 truncate font-mono text-[11px] text-[#5A6772]">{sub}</div> : null}
      </div>
      {extra}
      <div className="text-right">
        <Legend>{t("hud.score")}</Legend>
        <motion.div
          key={score}
          initial={{ scale: 1.25, color: "#FFD27A" }}
          animate={{ scale: 1, color: "#FFB627" }}
          transition={{ duration: 0.3 }}
          className="font-mono text-[19px] font-bold tabular-nums leading-none"
        >
          {score.toLocaleString()}
        </motion.div>
      </div>
      <div className="hidden text-right sm:block">
        <Legend>{t("hud.round")}</Legend>
        <div className="font-mono text-[19px] font-bold tabular-nums leading-none text-[#E6EDF2]">
          {String(round).padStart(2, "0")}
          <span className="text-[#5A6772]">/{String(total).padStart(2, "0")}</span>
        </div>
      </div>
      {onPause ? (
        <button
          onClick={onPause}
          className="rounded-[2px] border border-[#333B44] p-1.5 text-[#8C9AA5] transition-colors hover:border-[#FFB627] hover:text-[#FFB627]"
          title={t("hud.pause")}
        >
          <Icon name={paused ? "play" : "pause"} size={16} />
        </button>
      ) : null}
    </header>
  );
}

/* ── pause overlay ──────────────────────────────────────────────────────── */
export function PauseOverlay({
  open,
  onResume,
  onRestart,
  onExit,
  onHelp,
}: {
  open: boolean;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  onHelp?: () => void;
}) {
  const { t } = useI18n();
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-[#0E1114]/92 px-5"
        >
          <Panel className="w-full max-w-md p-7" legend={t("pause.legend")}>
            <h2 className="font-display text-[52px] font-bold leading-none text-[#FFB627]">{t("pause.title")}</h2>
            <p className="mt-2 font-serif text-[16px] italic text-[#8C9AA5]">{t("pause.sub")}</p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Btn tone="amber" onClick={onResume} kbd="ESC">
                <Icon name="play" size={15} /> {t("pause.resume")}
              </Btn>
              <Btn tone="steel" onClick={onRestart} kbd="R">
                <Icon name="restart" size={15} /> {t("pause.restart")}
              </Btn>
              {onHelp ? (
                <Btn tone="steel" onClick={onHelp}>
                  <Icon name="help" size={15} /> {t("app.howto")}
                </Btn>
              ) : null}
              <Btn tone="ghost" onClick={onExit}>
                <Icon name="home" size={15} /> {t("pause.quit")}
              </Btn>
            </div>
          </Panel>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ── round intro countdown ──────────────────────────────────────────────── */
export function IntroFlash({ show, label, sub }: { show: boolean; label: string; sub: string }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key={label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          className="fixed inset-0 z-[60] grid place-items-center bg-[#0E1114]/85 backdrop-blur-[2px]"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 1.35, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="font-display text-[clamp(3rem,15vw,8rem)] font-bold leading-none text-[#FFB627]"
              style={{ textShadow: "0 0 60px rgba(255,182,39,.4)" }}
            >
              {label}
            </motion.div>
            <Legend>{sub}</Legend>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ── pausable countdown clock — returns ms left, reacts to pause ────────── */
export function useCountdown(deadline: number, active: boolean) {
  const [left, setLeft] = useState(Math.max(0, deadline - Date.now()));
  useEffect(() => {
    if (!active) return;
    const tick = () => setLeft(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 60);
    return () => clearInterval(id);
  }, [deadline, active]);
  return left;
}

/* ── the full-bleed task band (phosphor CRT) ────────────────────────────── */
export function TaskBand({
  legend,
  right,
  brief,
  children,
  footer,
}: {
  legend: string;
  right?: string;
  brief: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section
      id="qband"
      className="relative border-b-2 border-[#FFB627]/30 bg-[#0E1114] px-4 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] sm:px-8 sm:py-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{ backgroundImage: "url(images/phosphor.jpg)", backgroundSize: "cover" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(180deg, rgba(255,182,39,0.05) 0px, rgba(255,182,39,0.05) 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div className="relative mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <Legend tone="amber">{legend}</Legend>
          <span className="h-px flex-1 bg-[#FFB627]/20" />
          {right ? <Legend>{right}</Legend> : null}
        </div>
        <p className="mt-3 max-w-3xl font-serif text-[19px] italic leading-snug text-[#E6EDF2] sm:text-[25px]">{brief}</p>
        {children}
        {footer}
      </div>
    </section>
  );
}

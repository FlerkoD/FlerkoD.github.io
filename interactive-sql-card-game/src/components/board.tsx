"use client";

import { Fragment, useEffect, useState } from "react";
import type { Question } from "@/content";
import { useI18n } from "@/i18n";
import { ClauseCard, Legend } from "./ui";

/* ── one blank in the statement ─────────────────────────────────────────── */
export function SlotChip({
  token,
  expected,
  wrong,
  reveal,
}: {
  token: string | null;
  expected?: string;
  wrong?: boolean;
  reveal?: boolean;
}) {
  const filled = token != null;
  return (
    <span
      data-slot
      className={`relative mx-1 inline-flex min-w-[8.5ch] translate-y-[3px] items-center justify-center rounded-[3px] border-2 px-2 py-[5px] align-middle font-mono text-[13px] font-bold uppercase tracking-tight transition-all duration-200 ease-[cubic-bezier(.2,1.6,.4,1)] sm:text-[15px] ${
        filled
          ? reveal && wrong
            ? "border-[#FF4D3D] bg-[#FF4D3D]/15 text-[#FF4D3D]"
            : reveal
              ? "border-[#33E0D0] bg-[#33E0D0]/15 text-[#33E0D0] shadow-[0_0_18px_rgba(51,224,208,0.35)]"
              : "border-[#B87A08] bg-[#FFB627] text-[#1A1714] shadow-[0_2px_0_#8A5B06]"
          : "border-dashed border-[#FFB627]/55 bg-[#FFB627]/8 text-[#FFB627]/50"
      }`}
    >
      {reveal && expected ? (
        <span className="flex flex-col items-center leading-none">
          <span style={{ color: wrong ? "#33E0D0" : undefined }}>{expected}</span>
          {wrong && token && token !== expected ? (
            <span className="mt-1 text-[9px] leading-none text-[#FF4D3D] line-through opacity-80">
              {token}
            </span>
          ) : null}
        </span>
      ) : filled ? (
        token
      ) : (
        <span className="animate-pulse opacity-60">▢</span>
      )}
    </span>
  );
}

/* ── the statement itself: a full-bleed architectural band ──────────────── */
export function QueryBoard({
  question,
  filled,
  reveal,
  compact,
}: {
  question: Question;
  filled: (string | null)[];
  reveal?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`font-mono font-medium leading-[2.1] tracking-tight text-[#FFD27A] ${compact ? "text-[13px] sm:text-[15px]" : "text-[15px] sm:text-[20px] lg:text-[23px]"}`}
    >
      {question.parts.map((p, i) => (
        <Fragment key={i}>
          <span className="whitespace-pre-wrap">{p}</span>
          {i < question.answer.length ? (
            <SlotChip
              token={filled[i] ?? null}
              expected={reveal ? question.answer[i] : undefined}
              wrong={reveal && !!filled[i] && filled[i] !== question.answer[i]}
              reveal={reveal}
            />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

/* ── hand of printed clause cards ───────────────────────────────────────── */
export function Hand({
  cards,
  filled,
  onPick,
  disabled,
  labels,
  label,
  tone,
  compact,
}: {
  cards: string[];
  filled: (string | null)[];
  onPick: (token: string, index: number) => void;
  disabled?: boolean;
  labels?: string[];
  label: string;
  tone?: "amber" | "cyan";
  compact?: boolean;
}) {
  const spent = new Set(filled.filter(Boolean) as string[]);
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <Legend tone={tone ?? "dim"}>{label}</Legend>
        <Legend>{labels ? labels.join(" · ") : "1 2 3 4 5"}</Legend>
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
        {cards.map((t, i) => (
          <ClauseCard
            key={t + i}
            token={t}
            index={i + 1}
            small={compact}
            showGloss={!compact}
            state={disabled ? "spent" : "idle"}
            onClick={disabled || spent.has(t) ? undefined : () => onPick(t, i)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── draining clock (compositor animated) + tabular readout ─────────────── */
export function ClockBar({
  limit,
  deadline,
  runId,
  paused,
}: {
  limit: number;
  deadline: number;
  runId: number;
  paused?: boolean;
}) {
  const { t } = useI18n();
  const [left, setLeft] = useState(limit);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setLeft(Math.max(0, deadline - Date.now()));
    }, 80);
    setLeft(Math.max(0, deadline - Date.now()));
    return () => clearInterval(id);
  }, [deadline, runId, paused]);

  const pct = Math.max(0, Math.min(1, left / limit));
  const urgent = pct < 0.28;
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between">
        <Legend tone={urgent ? "red" : "dim"}>{t("hud.clock")}</Legend>
        <span
          className={`font-mono text-[15px] font-bold tabular-nums ${urgent ? "text-[#FF4D3D]" : "text-[#FFB627]"}`}
        >
          {(left / 1000).toFixed(1)}s
        </span>
      </div>
      <div className="mt-1.5 h-[6px] overflow-hidden rounded-[1px] border border-[#333B44] bg-[#0E1114]">
        <div
          className="h-full origin-left transition-[width] duration-100 ease-linear"
          style={{
            width: `${pct * 100}%`,
            background: urgent ? "#FF4D3D" : "#FFB627",
            boxShadow: `0 0 10px ${urgent ? "#FF4D3D" : "#FFB627"}99`,
            opacity: paused ? 0.4 : 1,
          }}
        />
      </div>
    </div>
  );
}

/* ── combo readout ──────────────────────────────────────────────────────── */
export function ComboChip({ combo, streak }: { combo: number; streak: number }) {
  const { t } = useI18n();
  const hot = combo >= 3;
  return (
    <div
      className={`flex items-center gap-2 rounded-[2px] border px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
        hot
          ? "border-[#FFB627]/70 bg-[#FFB627]/15 text-[#FFB627]"
          : "border-[#333B44] bg-[#0E1114] text-[#5A6772]"
      }`}
    >
      <span className="tabular-nums">×{(1 + 0.2 * Math.min(combo, 5)).toFixed(1)}</span>
      <span className="opacity-50">|</span>
      <span className="tabular-nums">{t("hud.streak", { n: streak })}</span>
    </div>
  );
}

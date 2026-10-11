"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { QueryTask } from "@/content";
import { DB_BY_ID } from "@/content";
import { multOf } from "@/game/engine";
import { tx, useI18n } from "@/i18n";
import { BlockChip, Btn, Icon, Legend, Panel } from "./ui";

export type RoundOutcome = {
  kind: "accepted" | "rejected" | "timeout";
  /** builder: placed blocks. rapid: the typed text as a single entry */
  yours: string[];
  /** per-block correctness for builder rendering (optional) */
  marks?: boolean[];
  points: number;
  ms: number;
  combo: number;
  crit: boolean;
  lifeLost?: boolean;
};

export default function RoundEndOverlay({
  task,
  outcome,
  last,
  onNext,
  typed,
}: {
  task: QueryTask;
  outcome: RoundOutcome;
  last: boolean;
  onNext: () => void;
  /** render "yours" as raw typed text instead of blocks */
  typed?: boolean;
}) {
  const { t, locale } = useI18n();
  const ok = outcome.kind === "accepted";
  const color = ok ? (outcome.crit ? "#FFD27A" : "#33E0D0") : "#FF4D3D";
  const title = t(ok ? "end.accepted" : outcome.kind === "timeout" ? "end.timeout" : "end.rejected");

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onNext();
      }
    };
    // small delay so the key that submitted the round doesn't skip the report
    const id = setTimeout(() => window.addEventListener("keydown", h), 280);
    return () => {
      clearTimeout(id);
      window.removeEventListener("keydown", h);
    };
  }, [onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex items-end justify-center overflow-y-auto bg-[#0E1114]/88 px-3 py-4 backdrop-blur-[2px] sm:items-center sm:px-6"
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="w-full max-w-3xl"
      >
        <Panel className="p-5 sm:p-7" legend={`${DB_BY_ID[task.db]?.name ?? ""} // ${task.id.toUpperCase()}`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <motion.h2
                initial={{ letterSpacing: "0.3em", opacity: 0 }}
                animate={{ letterSpacing: "-0.01em", opacity: 1 }}
                transition={{ duration: 0.45, ease: [0.2, 1, 0.3, 1] }}
                className="font-display text-[clamp(2rem,7vw,3.6rem)] font-bold leading-[0.9]"
                style={{ color, textShadow: `0 0 36px ${color}55` }}
              >
                {title}
              </motion.h2>
              <p className="mt-2 max-w-xl font-serif text-[16px] italic leading-snug text-[#8C9AA5] sm:text-[18px]">{tx(task.brief, locale)}</p>
            </div>
            {outcome.lifeLost ? (
              <span className="rounded-[2px] border border-[#FF4D3D]/60 bg-[#FF4D3D]/15 px-2.5 py-1 font-mono text-[11px] font-bold tracking-[0.18em] text-[#FF4D3D]">
                {t("end.lifeLost")}
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4">
            <div>
              <Legend tone={ok ? "cyan" : "red"}>{t("end.yours")}</Legend>
              <div className="mt-1.5 rounded-[3px] border border-[#333B44] bg-[#0E1114] px-3 py-3">
                {outcome.yours.length === 0 || (typed && !outcome.yours[0]?.trim()) ? (
                  <span className="font-mono text-[13px] text-[#5A6772]">{t("end.empty")}</span>
                ) : typed ? (
                  <pre className={`whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed sm:text-[14px] ${ok ? "text-[#33E0D0]" : "text-[#FF8A7E]"}`}>
                    {outcome.yours[0]}
                  </pre>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {outcome.yours.map((b, i) => (
                      <BlockChip key={i} text={b} placed state={outcome.marks?.[i] ? "good" : "bad"} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!ok ? (
              <div>
                <Legend tone="amber">{t("end.reference")}</Legend>
                <div className="mt-1.5 rounded-[3px] border border-[#FFB627]/30 bg-[#131619] px-3 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {task.blocks.map((b, i) => (
                      <BlockChip key={i} text={b} placed />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-start gap-3 border-l-2 border-[#FFB627]/50 pl-3">
              <Legend tone="amber" className="mt-1 shrink-0">
                {t("end.why")}
              </Legend>
              <p className="font-serif text-[16px] italic leading-snug text-[#E6EDF2] sm:text-[18px]">{tx(task.why, locale)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-[#2A3138] pt-4">
            <dl className="flex gap-6">
              {[
                [t("end.points"), outcome.points > 0 ? `+${outcome.points}` : "0", ok ? "#FFB627" : "#5A6772"],
                [t("end.time"), `${(outcome.ms / 1000).toFixed(1)}s`, "#E6EDF2"],
                [t("end.combo"), `×${multOf(outcome.combo).toFixed(1)}`, outcome.combo >= 3 ? "#FFB627" : "#E6EDF2"],
              ].map(([k, v, c]) => (
                <div key={k}>
                  <dt>
                    <Legend>{k}</Legend>
                  </dt>
                  <dd className="mt-0.5 font-mono text-[22px] font-bold tabular-nums leading-none" style={{ color: c }}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col items-end gap-1.5">
              <Btn tone="amber" onClick={onNext} kbd="ENTER">
                <Icon name={last ? "trophy" : "chevron"} size={15} /> {t(last ? "end.report" : "end.next")}
              </Btn>
            </div>
          </div>
        </Panel>
      </motion.div>
    </motion.div>
  );
}

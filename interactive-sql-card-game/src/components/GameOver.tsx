"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MEDAL, loadScores, saveScore, type ScoreRow } from "@/game/engine";
import { DB_BY_ID, type GameKind } from "@/content";
import { useI18n, type DictKey } from "@/i18n";
import { Btn, Icon, Legend, Mark, Panel } from "./ui";

const GAME_KEY: Record<GameKind, DictKey> = { duel: "game.duel", builder: "game.builder", rapid: "game.rapid" };

export function HighScoreTable({
  rows,
  highlight,
  filterLabel,
}: {
  rows: ScoreRow[];
  highlight?: number;
  filterLabel?: string;
}) {
  const { t } = useI18n();
  return (
    <Panel legend={filterLabel ?? t("hs.legendAll")} className="p-4 pt-5">
      {rows.length === 0 ? (
        <p className="py-6 text-center font-serif text-[15px] italic text-[#5A6772]">{t("hs.empty")}</p>
      ) : (
        <ol className="divide-y divide-[#2A3138]">
          {rows.map((r, i) => (
            <li
              key={r.date + "-" + i}
              className={`flex items-center gap-3 py-2 ${r.date === highlight ? "-mx-2 rounded-[2px] bg-[#FFB627]/10 px-2" : ""}`}
            >
              <span className="w-6 shrink-0 font-mono text-[12px] font-bold tabular-nums" style={{ color: MEDAL[i] ?? "#5A6772" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-[#E6EDF2]">
                {r.name}
              </span>
              <span className="hidden shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#5A6772] md:block">
                {t(GAME_KEY[r.game ?? "duel"])} · {DB_BY_ID[r.db]?.name ?? r.db} · {t(`tier.${r.tier}` as DictKey)}
              </span>
              <span className="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#8C9AA5]">{Math.round(r.accuracy)}%</span>
              <span className="w-20 shrink-0 text-right font-mono text-[14px] font-bold tabular-nums text-[#FFB627]">
                {r.score.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

export type MatchStats = {
  score: number;
  correct: number;
  answered: number;
  bestCombo: number;
  streak: number;
  round: number;
  total: number;
  hp: number;
  foeHp: number;
  /** duel: 0 = you, 1 = foe, null = draw. solo modes: 0 = clean sweep, null = complete, 1 = died */
  winner: number | null;
};

export default function GameOver({
  stats,
  mode,
  game = "duel",
  tier,
  dbId,
  onRestart,
  onHome,
}: {
  stats: MatchStats;
  mode: "solo" | "local" | "online";
  game?: GameKind;
  tier: number;
  dbId: string;
  onRestart: () => void;
  onHome: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [savedAt, setSavedAt] = useState<number | undefined>(undefined);
  const [filter, setFilter] = useState<"all" | "game" | "db" | "tier">("game");

  useEffect(() => {
    setRows(loadScores());
    setName(localStorage.getItem("qc.callsign") ?? "");
  }, []);

  const accuracy = stats.answered ? (stats.correct / stats.answered) * 100 : 0;
  const solo = game !== "duel";
  const v = solo
    ? stats.winner === 0
      ? { k: "over.sweep", c: "#FFB627" }
      : stats.winner === 1
        ? { k: "over.dead", c: "#FF4D3D" }
        : { k: "over.complete", c: "#33E0D0" }
    : stats.winner === 0
      ? { k: "over.victory", c: "#FFB627" }
      : stats.winner === 1
        ? { k: "over.defeat", c: "#FF4D3D" }
        : { k: "over.draw", c: "#8C9AA5" };

  const commit = () => {
    const n = (name.trim() || "ANON").toUpperCase().slice(0, 10);
    const stamp = Date.now();
    saveScore({ name: n, score: stats.score, tier, db: dbId, mode, game, accuracy, date: stamp });
    localStorage.setItem("qc.callsign", n);
    setSavedAt(stamp);
    setRows(loadScores());
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key.toLowerCase() === "r") onRestart();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onRestart]);

  const shown = rows
    .filter((r) =>
      filter === "all" ? true : filter === "game" ? (r.game ?? "duel") === game : filter === "db" ? r.db === dbId : r.tier === tier,
    )
    .slice(0, 8);
  const legendOf =
    filter === "all"
      ? t("hs.legendAll")
      : t("hs.legendOf", {
          x: filter === "game" ? t(GAME_KEY[game]) : filter === "db" ? DB_BY_ID[dbId]?.name ?? dbId : t(`tier.${tier}` as DictKey),
        });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="relative min-h-[100dvh] w-full bg-[#0E1114] px-4 py-8 sm:px-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ backgroundImage: "url(images/phosphor.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#0E1114]/70" />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-5">
        <div className="flex items-center gap-3">
          <Mark size={34} />
          <Legend>
            {t("over.terminated", { info: `${t(GAME_KEY[game])} · ${DB_BY_ID[dbId]?.name ?? ""} · ${t(`tier.${tier}` as DictKey)}` })}
          </Legend>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <Panel className="overflow-hidden p-6 sm:p-8" legend={t("over.report")}>
            <motion.h2
              initial={{ y: 18, opacity: 0, letterSpacing: "0.3em" }}
              animate={{ y: 0, opacity: 1, letterSpacing: "-0.02em" }}
              transition={{ duration: 0.5, ease: [0.2, 1, 0.3, 1] }}
              className="font-display text-[clamp(2.3rem,9vw,5rem)] font-bold leading-[0.88]"
              style={{ color: v.c, textShadow: `0 0 40px ${v.c}55` }}
            >
              {t(v.k as DictKey)}
            </motion.h2>
            <p className="mt-3 max-w-md font-serif text-[17px] italic leading-snug text-[#8C9AA5]">{t(`${v.k}.sub` as DictKey)}</p>

            <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {(
                [
                  ["over.score", stats.score.toLocaleString(), "#FFB627"],
                  solo
                    ? ["over.solved", `${stats.correct}/${stats.total}`, "#E6EDF2"]
                    : ["over.accuracy", `${Math.round(accuracy)}%`, "#E6EDF2"],
                  ["over.bestCombo", `×${(1 + 0.2 * Math.min(stats.bestCombo, 5)).toFixed(1)}`, "#E6EDF2"],
                  solo ? ["over.accuracy", `${Math.round(accuracy)}%`, "#E6EDF2"] : ["over.streak", String(stats.streak), "#E6EDF2"],
                ] as [DictKey, string, string][]
              ).map(([k, val, c]) => (
                <div key={k}>
                  <dt>
                    <Legend>{t(k)}</Legend>
                  </dt>
                  <dd className="mt-1 font-mono text-[26px] font-bold tabular-nums leading-none" style={{ color: c }}>
                    {val}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <Btn tone="amber" onClick={onRestart} kbd="R">
                <Icon name="restart" size={15} /> {t("over.again")}
              </Btn>
              <Btn tone="ghost" onClick={onHome}>
                <Icon name="home" size={15} /> {t("over.console")}
              </Btn>
            </div>
          </Panel>

          <div className="flex flex-col gap-5">
            <Panel className="p-5" legend={t("over.file")}>
              {savedAt ? (
                <p className="py-3 text-center font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#33E0D0]">{t("over.filed")}</p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="flex-1">
                    <Legend>{t("over.callsign")}</Legend>
                    <input
                      value={name}
                      maxLength={10}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commit();
                        e.stopPropagation();
                      }}
                      placeholder="OPERATOR"
                      className="mt-1 w-full rounded-[2px] border border-[#3C454E] bg-[#0E1114] px-3 py-2.5 font-mono text-[13px] font-bold uppercase tracking-[0.18em] text-[#FFB627] outline-none placeholder:text-[#3C454E] focus:border-[#FFB627]"
                    />
                  </label>
                  <Btn tone="steel" onClick={commit}>
                    <Icon name="check" size={15} /> {t("over.fileBtn")}
                  </Btn>
                </div>
              )}
            </Panel>

            <div className="flex flex-wrap gap-1.5">
              {(["game", "all", "db", "tier"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-[2px] border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${
                    filter === f ? "border-[#FFB627] bg-[#FFB627]/15 text-[#FFB627]" : "border-[#333B44] text-[#5A6772] hover:text-[#8C9AA5]"
                  }`}
                >
                  {t(f === "all" ? "hs.all" : f === "game" ? "hs.game" : f === "db" ? "hs.db" : "hs.tier")}
                </button>
              ))}
            </div>

            <HighScoreTable rows={shown} highlight={savedAt} filterLabel={legendOf} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

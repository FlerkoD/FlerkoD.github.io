"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BUILDER_META, DATABASES, DUEL_QUESTIONS, QUERY_TASKS, RAPID_META, TIER_META, type GameKind } from "@/content";
import { loadScores, type ScoreRow } from "@/game/engine";
import { loadSoundPref, setSound, soundOn } from "@/game/sfx";
import { tx, useI18n, type DictKey } from "@/i18n";
import { Btn, Icon, LangSwitch, Legend, Mark, Panel } from "./ui";
import { SchemaPanel } from "./shared";
import { HighScoreTable } from "./GameOver";

export type Opp = "solo" | "local" | "online";
export type StartCfg = { game: GameKind; opp: Opp; dbId: string; tier: number };

const PREF = "qc.lastcfg";

/** Онлайн-режиму нужен сервер + база. В статической сборке он выключается. */
export const ONLINE_ENABLED = process.env.NEXT_PUBLIC_ONLINE !== "0";

export default function TitleScreen({ onStart, onHelp }: { onStart: (cfg: StartCfg) => void; onHelp: () => void }) {
  const { t, locale } = useI18n();
  const [dbId, setDbId] = useState("northwind");
  const [tier, setTier] = useState(1);
  const [game, setGame] = useState<GameKind>("duel");
  const [opp, setOpp] = useState<Opp>("solo");
  const [sound, setSnd] = useState(true);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [seenManual, setSeenManual] = useState(true);

  useEffect(() => {
    loadSoundPref();
    setSnd(soundOn());
    setRows(loadScores().slice(0, 8));
    setSeenManual(localStorage.getItem("qc.manual") === "1");
    try {
      const c = JSON.parse(localStorage.getItem(PREF) ?? "null") as Partial<StartCfg> | null;
      if (c) {
        if (c.dbId && DATABASES.some((d) => d.id === c.dbId)) setDbId(c.dbId);
        if (c.tier && c.tier >= 1 && c.tier <= 3) setTier(c.tier);
        if (c.game) setGame(c.game);
        if (c.opp && (c.opp !== "online" || ONLINE_ENABLED)) setOpp(c.opp);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const go = () => {
    const cfg = { game, opp: game === "duel" ? opp : "solo", dbId, tier } as StartCfg;
    localStorage.setItem(PREF, JSON.stringify(cfg));
    onStart(cfg);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.target as HTMLElement)?.tagName !== "BUTTON") go();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const openHelp = () => {
    localStorage.setItem("qc.manual", "1");
    setSeenManual(true);
    onHelp();
  };

  const db = DATABASES.find((d) => d.id === dbId) ?? DATABASES[0];
  const tierName = t(`tier.${tier}` as DictKey);
  const rounds = game === "duel" ? TIER_META[tier].rounds : game === "builder" ? BUILDER_META[tier].rounds : RAPID_META[tier].rounds;
  const tierDetail = (n: number) =>
    game === "duel"
      ? `${(TIER_META[n].limit / 1000).toFixed(0)}s · ${t("title.rounds", { n: TIER_META[n].rounds })}`
      : game === "builder"
        ? `${t("title.perQuery", { s: BUILDER_META[n].limit / 1000 })}`
        : `${t("title.lives", { n: RAPID_META[n].lives })} · ×${RAPID_META[n].cps} cps`;
  const cta = game === "duel" ? (opp === "online" ? "title.openRoom" : "title.execute") : game === "builder" ? "title.startBuilder" : "title.startRapid";
  const totalQ = DUEL_QUESTIONS.length + QUERY_TASKS.length;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#131619]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[52vh] sm:h-[62vh]" style={{ backgroundImage: "url(images/keyart.jpg)", backgroundSize: "cover", backgroundPosition: "center 42%" }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[52vh] sm:h-[62vh]"
        style={{ background: "linear-gradient(180deg, rgba(19,22,25,0.86) 0%, rgba(19,22,25,0.45) 38%, rgba(19,22,25,0.92) 84%, #131619 100%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[52vh] opacity-[0.16] sm:h-[62vh]"
        style={{ background: "repeating-linear-gradient(180deg, rgba(255,182,39,0.14) 0px, rgba(255,182,39,0.14) 1px, transparent 1px, transparent 4px)" }}
      />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-6 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Mark size={38} />
            <Legend className="hidden sm:inline">{t("app.tag")}</Legend>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openHelp}
              className="relative flex items-center gap-2 rounded-[2px] border border-[#FFB627]/50 bg-[#FFB627]/10 px-3 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#FFB627] transition-colors hover:bg-[#FFB627]/20"
            >
              <Icon name="help" size={14} /> {t("app.howto")}
              {!seenManual ? <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-[#FFB627]" /> : null}
            </button>
            <LangSwitch />
            <button
              onClick={() => {
                setSound(!sound);
                setSnd(!sound);
              }}
              className="rounded-[2px] border border-[#333B44] p-2 text-[#8C9AA5] transition-colors hover:border-[#FFB627] hover:text-[#FFB627]"
              title={t(sound ? "app.mute" : "app.unmute")}
            >
              <Icon name={sound ? "sound" : "mute"} size={16} />
            </button>
          </div>
        </header>

        <div className="pt-4 sm:pt-10">
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 1, 0.3, 1] }}
            className="font-display text-[clamp(3.2rem,15vw,10rem)] font-bold uppercase leading-[0.8] tracking-[-0.035em] text-[#FFB627]"
            style={{ textShadow: "0 0 70px rgba(255,182,39,0.32)" }}
          >
            Query
            <br />
            <span className="text-[#E6EDF2]">Clash</span>
          </motion.h1>
          <motion.p
            key={locale}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-5 max-w-xl font-serif text-[19px] italic leading-snug text-[#8C9AA5] sm:text-[23px]"
          >
            {t("title.sub")}
          </motion.p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              t("title.chipDbs", { n: DATABASES.length }),
              t("title.chipTiers"),
              t("title.chipModes"),
              t(ONLINE_ENABLED ? "title.chipOpp" : "title.chipOppOffline"),
              t("title.chipQueries", { n: totalQ }),
            ].map((c) => (
              <span key={c} className="rounded-[2px] border border-[#FFB627]/30 bg-[#FFB627]/8 px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#FFB627]">
                {c}
              </span>
            ))}
          </div>
          {!seenManual ? (
            <button onClick={openHelp} className="mt-4 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#33E0D0] underline decoration-dotted underline-offset-4 hover:text-[#7BF0E5]">
              {t("app.newHere")} →
            </button>
          ) : null}
        </div>

        <div className="grid gap-7 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Legend>{t("title.schemas", { db: db.name })}</Legend>
            <div className="mt-3 flex flex-col gap-2.5">
              <AnimatePresence mode="wait">
                <motion.div key={db.id} initial={{ opacity: 0, y: 18, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: -0.6 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.2, 1, 0.3, 1] }}>
                  <SchemaPanel db={db} />
                </motion.div>
              </AnimatePresence>
              <p className="px-1 font-serif text-[15px] italic leading-snug text-[#5A6772]">{tx(db.brief, locale)}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-2">
              {DATABASES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDbId(d.id)}
                  className={`flex items-center gap-2 rounded-[2px] border px-2.5 py-2 text-left transition-all duration-150 ${
                    d.id === dbId ? "border-[#FFB627] bg-[#FFB627]/12 text-[#FFB627]" : "border-[#333B44] bg-[#1C2126] text-[#8C9AA5] hover:border-[#8C9AA5] hover:text-[#E6EDF2]"
                  }`}
                >
                  <Icon name={d.glyph} size={17} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[9.5px] font-bold uppercase tracking-[0.12em]">{d.name}</span>
                    <span className="block truncate font-mono text-[8px] uppercase tracking-[0.08em] opacity-55">{tx(d.tagline, locale)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:col-span-7">
            <Panel className="p-5 sm:p-6" legend={t("title.config")}>
              <Legend>{t("title.game")}</Legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["duel", "cards"],
                    ["builder", "blocks"],
                    ["rapid", "keyboard"],
                  ] as const
                ).map(([g, ic]) => (
                  <button
                    key={g}
                    onClick={() => setGame(g)}
                    className={`rounded-[3px] border px-3 py-3 text-left transition-all duration-150 ${
                      g === game ? "border-[#FFB627] bg-[#FFB627]/12 shadow-[0_0_24px_rgba(255,182,39,0.14)]" : "border-[#333B44] bg-[#0E1114] hover:border-[#8C9AA5]"
                    }`}
                  >
                    <Icon name={ic} size={19} className={g === game ? "text-[#FFB627]" : "text-[#8C9AA5]"} />
                    <span className={`mt-2 block font-display text-[17px] font-bold leading-tight ${g === game ? "text-[#FFB627]" : "text-[#E6EDF2]"}`}>{t(`game.${g}` as DictKey)}</span>
                    <span className="mt-1 block text-[11.5px] leading-snug text-[#5A6772]">{t(`game.${g}.sub` as DictKey)}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <Legend>{t("title.tier")}</Legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setTier(n)}
                      className={`rounded-[3px] border px-3 py-3 text-left transition-all duration-150 ${
                        n === tier ? "border-[#FFB627] bg-[#FFB627]/12" : "border-[#333B44] bg-[#0E1114] hover:border-[#8C9AA5]"
                      }`}
                    >
                      <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#5A6772]">{t("tier.sub", { n: String(n).padStart(2, "0") })}</span>
                      <span className={`mt-0.5 block font-display text-[20px] font-bold leading-none ${n === tier ? "text-[#FFB627]" : "text-[#E6EDF2]"}`}>{t(`tier.${n}` as DictKey)}</span>
                      <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.1em] text-[#5A6772]">{tierDetail(n)}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 font-serif text-[15px] italic leading-snug text-[#8C9AA5]">{t(`tier.${tier}.${game}` as DictKey)}</p>
              </div>

              <AnimatePresence initial={false}>
                {game === "duel" ? (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-6">
                      <Legend>{t("title.opponent")}</Legend>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {(
                          [
                            ["solo", "monitor"],
                            ["local", "users"],
                            ...(ONLINE_ENABLED ? ([["online", "wifi"]] as const) : []),
                          ] as const
                        ).map(([m, ic]) => (
                          <button
                            key={m}
                            onClick={() => setOpp(m)}
                            className={`rounded-[3px] border px-3 py-3 text-left transition-all duration-150 ${m === opp ? "border-[#33E0D0] bg-[#33E0D0]/10" : "border-[#333B44] bg-[#0E1114] hover:border-[#8C9AA5]"}`}
                          >
                            <Icon name={ic} size={18} className={m === opp ? "text-[#33E0D0]" : "text-[#8C9AA5]"} />
                            <span className={`mt-2 block font-mono text-[11px] font-bold uppercase tracking-[0.16em] ${m === opp ? "text-[#33E0D0]" : "text-[#E6EDF2]"}`}>{t(`opp.${m}` as DictKey)}</span>
                            <span className="mt-0.5 block font-mono text-[8.5px] uppercase tracking-[0.1em] text-[#5A6772]">{t(`opp.${m}.sub` as DictKey)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Btn tone="amber" onClick={go} kbd="ENTER">
                  <Icon name="bolt" size={15} /> {t(cta as DictKey)}
                </Btn>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5A6772]">{t("title.summary", { db: db.name, tier: tierName, n: rounds })}</span>
              </div>
            </Panel>

            <HighScoreTable rows={rows} filterLabel={t("title.topScores")} />
          </div>
        </div>
      </div>
    </div>
  );
}

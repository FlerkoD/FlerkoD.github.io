"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n, type DictKey } from "@/i18n";
import { BlockChip, ClauseCard, Icon, Legend, Panel } from "./ui";

export type HowTab = "basics" | "duel" | "builder" | "rapid" | "scoring";
const TABS: { id: HowTab; icon: "help" | "cards" | "blocks" | "keyboard" | "trophy" }[] = [
  { id: "basics", icon: "help" },
  { id: "duel", icon: "cards" },
  { id: "builder", icon: "blocks" },
  { id: "rapid", icon: "keyboard" },
  { id: "scoring", icon: "trophy" },
];

/* small animated demos that show each mode's core gesture */
function Demo({ tab }: { tab: HowTab }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 1100);
    return () => clearInterval(id);
  }, []);

  if (tab === "duel") {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-[3px] border border-[#FFB627]/25 bg-[#0B0D0F] px-3 py-3 font-mono text-[13px] leading-[2] text-[#FFD27A]">
          SELECT * FROM orders{" "}
          <span
            className={`mx-1 inline-flex min-w-[7ch] justify-center rounded-[3px] border-2 px-2 py-0.5 font-bold transition-all duration-200 ${
              step >= 2 ? "border-[#33E0D0] bg-[#33E0D0]/15 text-[#33E0D0]" : step >= 1 ? "border-[#B87A08] bg-[#FFB627] text-[#1A1714]" : "border-dashed border-[#FFB627]/50 text-[#FFB627]/40"
            }`}
          >
            {step >= 1 ? "WHERE" : "▢"}
          </span>{" "}
          order_id = 7
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["HAVING", "WHERE", "ON"].map((c, i) => (
            <div key={c} className={`transition-all duration-200 ${step === 1 && i === 1 ? "-translate-y-2 opacity-0" : step >= 2 && i === 1 ? "opacity-20" : ""}`}>
              <ClauseCard token={c} index={i + 1} small showGloss={false} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (tab === "builder") {
    const line = ["SELECT", "title", "FROM", "books"].slice(0, step + 1);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex min-h-[48px] flex-wrap items-center gap-1.5 rounded-[3px] border border-[#FFB627]/25 bg-[#0B0D0F] px-3 py-2.5">
          {line.map((b) => (
            <motion.span key={b} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <BlockChip text={b} placed />
            </motion.span>
          ))}
          <span className="inline-block h-[22px] w-[8px] animate-pulse bg-[#FFB627]/70" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["books", "HAVING", "title", "FROM", "SELECT", "book =="].map((b, i) => (
            <BlockChip key={b} text={b} index={i} state={line.includes(b) ? "ghost" : "idle"} />
          ))}
        </div>
      </div>
    );
  }
  if (tab === "rapid") {
    const full = "SELECT title FROM books WHERE published_year < 1900";
    const shown = full.slice(0, Math.round(((step + 1) / 4) * full.length));
    return (
      <div className="rounded-[3px] border border-[#FFB627]/30 bg-[#0B0D0F]">
        <div className="border-b border-[#FFB627]/15 px-3 py-1.5">
          <Legend tone="amber">psql&gt; libris</Legend>
        </div>
        <div className="min-h-[70px] px-3 py-3 font-mono text-[14px] text-[#FFD27A]" style={{ textShadow: "0 0 10px rgba(255,182,39,.35)" }}>
          {shown}
          <span className="ml-0.5 inline-block h-[16px] w-[8px] translate-y-[3px] animate-pulse bg-[#FFB627]" />
        </div>
        <div className="h-[4px] bg-[#0E1114]">
          <div className="h-full bg-[#33E0D0] transition-[width] duration-500" style={{ width: `${((step + 1) / 4) * 100}%` }} />
        </div>
      </div>
    );
  }
  if (tab === "scoring") {
    return (
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["BASE", "+200", "#E6EDF2"],
          ["SPEED", `+${[180, 120, 60, 20][step]}`, "#FFB627"],
          ["COMBO", `×${(1 + 0.2 * Math.min(step + 1, 5)).toFixed(1)}`, "#33E0D0"],
        ].map(([k, v, c]) => (
          <div key={k} className="rounded-[3px] border border-[#333B44] bg-[#0E1114] px-2 py-3">
            <Legend>{k}</Legend>
            <div className="mt-1 font-mono text-[22px] font-bold tabular-nums" style={{ color: c }}>
              {v}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {(["tier.1", "tier.2", "tier.3"] as DictKey[]).map((k, i) => (
        <TierPip key={k} k={k} active={step % 3 === i} />
      ))}
    </div>
  );
}

function TierPip({ k, active }: { k: DictKey; active: boolean }) {
  const { t } = useI18n();
  return (
    <div className={`rounded-[3px] border px-2 py-3 text-center transition-all duration-300 ${active ? "border-[#FFB627] bg-[#FFB627]/12" : "border-[#333B44] bg-[#0E1114]"}`}>
      <div className={`font-display text-[15px] font-bold ${active ? "text-[#FFB627]" : "text-[#8C9AA5]"}`}>{t(k)}</div>
    </div>
  );
}

export default function HowTo({ open, onClose, initial = "basics" }: { open: boolean; onClose: () => void; initial?: HowTab }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<HowTab>(initial);

  useEffect(() => {
    if (open) setTab(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
      const i = TABS.findIndex((x) => x.id === tab);
      if (e.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length].id);
      if (e.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [open, tab, onClose]);

  const steps = [1, 2, 3, 4].map((n) => t(`how.${tab}.${n}` as DictKey));
  const hasControls = tab === "duel" || tab === "builder" || tab === "rapid";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto bg-[#0E1114]/92 px-3 py-4 sm:items-center sm:px-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Panel className="p-5 sm:p-7" legend={t("how.legend")}>
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-display text-[clamp(2rem,6vw,3.4rem)] font-bold leading-none tracking-[-0.02em] text-[#FFB627]">{t("how.title")}</h2>
                <button onClick={onClose} className="rounded-[2px] border border-[#333B44] p-2 text-[#8C9AA5] hover:border-[#FFB627] hover:text-[#FFB627]" title={t("how.close")}>
                  <Icon name="x" size={16} />
                </button>
              </div>

              <div role="tablist" className="mt-5 flex gap-1 overflow-x-auto border-b border-[#2A3138] pb-px">
                {TABS.map((x) => (
                  <button
                    key={x.id}
                    role="tab"
                    aria-selected={tab === x.id}
                    onClick={() => setTab(x.id)}
                    className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] transition-colors ${
                      tab === x.id ? "border-[#FFB627] text-[#FFB627]" : "border-transparent text-[#5A6772] hover:text-[#8C9AA5]"
                    }`}
                  >
                    <Icon name={x.icon} size={14} /> {t(`how.tab.${x.id}` as DictKey)}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_1fr]"
                >
                  <div>
                    <p className="font-serif text-[18px] italic leading-snug text-[#E6EDF2] sm:text-[21px]">{t(`how.${tab}.lead` as DictKey)}</p>
                    <ol className="mt-5 flex flex-col gap-3.5">
                      {steps.map((s, i) => (
                        <li key={i} className="flex gap-3.5">
                          <span className="font-display text-[26px] font-bold leading-none text-[#FFB627]/80 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                          <span className="pt-0.5 text-[14.5px] leading-relaxed text-[#C9D4DC]">{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="flex flex-col gap-4">
                    <Demo tab={tab} />
                    {hasControls ? (
                      <div className="grid gap-2">
                        {(
                          [
                            ["keyboard", "how.keyboard", `how.${tab}.k`],
                            ["monitor", "how.touch", `how.${tab}.t`],
                          ] as const
                        ).map(([ic, label, key]) => (
                          <div key={label} className="rounded-[3px] border border-[#333B44] bg-[#0E1114] px-3 py-2.5">
                            <div className="flex items-center gap-2 text-[#8C9AA5]">
                              <Icon name={ic} size={14} />
                              <Legend>{t(label)}</Legend>
                            </div>
                            <p className="mt-1.5 font-mono text-[11.5px] leading-relaxed text-[#E6EDF2]">{t(key as DictKey)}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              </AnimatePresence>
            </Panel>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

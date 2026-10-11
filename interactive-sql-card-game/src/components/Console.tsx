"use client";

import { useState } from "react";
import { I18nProvider } from "@/i18n";
import Fx from "./Fx";
import TitleScreen, { type StartCfg } from "./TitleScreen";
import Match from "./Match";
import Online from "./Online";
import Builder from "./Builder";
import Rapid from "./Rapid";
import HowTo, { type HowTab } from "./HowTo";

export default function Console() {
  return (
    <I18nProvider>
      <ConsoleInner />
    </I18nProvider>
  );
}

function ConsoleInner() {
  const [cfg, setCfg] = useState<StartCfg | null>(null);
  const [help, setHelp] = useState<{ open: boolean; tab: HowTab }>({ open: false, tab: "basics" });
  const home = () => setCfg(null);
  const openHelp = (tab: HowTab) => () => setHelp({ open: true, tab });

  return (
    <>
      <Fx />
      {!cfg ? <TitleScreen onStart={setCfg} onHelp={openHelp("basics")} /> : null}
      {cfg?.game === "duel" && cfg.opp !== "online" ? (
        <Match mode={cfg.opp as "solo" | "local"} dbId={cfg.dbId} tier={cfg.tier} onExit={home} onHelp={openHelp("duel")} />
      ) : null}
      {cfg?.game === "duel" && cfg.opp === "online" ? <Online dbId={cfg.dbId} tier={cfg.tier} onExit={home} /> : null}
      {cfg?.game === "builder" ? <Builder dbId={cfg.dbId} tier={cfg.tier} onExit={home} onHelp={openHelp("builder")} /> : null}
      {cfg?.game === "rapid" ? <Rapid dbId={cfg.dbId} tier={cfg.tier} onExit={home} onHelp={openHelp("rapid")} /> : null}
      <HowTo open={help.open} initial={help.tab} onClose={() => setHelp((h) => ({ ...h, open: false }))} />
    </>
  );
}

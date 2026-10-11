"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { DB_BY_ID, TIER_META, type Question } from "@/content";
import { loadSoundPref, sfx } from "@/game/sfx";
import { burstEl, shake } from "@/game/fx";
import { tx, useI18n, type DictKey } from "@/i18n";
import { Btn, ClauseCard, HpBar, Icon, Legend, Mark, Panel } from "./ui";
import { ClockBar, ComboChip, Hand, QueryBoard } from "./board";
import { GameHeader, TaskBand } from "./shared";
import GameOver, { type MatchStats } from "./GameOver";

type PubPlayer = {
  token: string; name: string; isHost: boolean; isBot: boolean; seat: number; hp: number; score: number;
  combo: number; bestCombo: number; streak: number; correct: number; answered: number; answerRound: number; answerMs: number;
};
type RoomResult = {
  round: number; correct: boolean[]; ms: number[]; crit: boolean[]; points: number[]; damage: number[];
  played: string[][]; winner: number | null; until: number;
};
type RoomView = {
  code: string; state: string; round: number; totalRounds: number; topic: string; difficulty: number;
  roundStartedAt: number; roundResult: RoomResult | null; question: Question | null; meToken: string;
};

async function call(body: Record<string, unknown>) {
  try {
    const res = await fetch("/api/room", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return await res.json();
  } catch {
    return { error: "generic", code: "generic" };
  }
}

export default function Online({ dbId, tier, onExit }: { dbId: string; tier: number; onExit: () => void }) {
  const { t, locale } = useI18n();
  const [screen, setScreen] = useState<"form" | "lobby" | "match" | "over">("form");
  const [name, setName] = useState("");
  const [codeIn, setCodeIn] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [players, setPlayers] = useState<PubPlayer[]>([]);
  const [filled, setFilled] = useState<(string | null)[]>([]);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const sentRef = useRef(-1);
  const filledRef = useRef<(string | null)[]>([]);
  const startedRef = useRef(-1);
  const revealSeen = useRef(-1);

  const errText = (d: { code?: string }) => t((`err.${d?.code ?? "generic"}`) as DictKey);

  useEffect(() => {
    loadSoundPref();
    setName(localStorage.getItem("qc.callsign") ?? "");
  }, []);

  const ingest = useCallback((d: { room: RoomView; players: PubPlayer[] }) => {
    setRoom(d.room);
    setPlayers(d.players);
    const q = d.room.question;
    if (q && startedRef.current !== d.room.round) {
      startedRef.current = d.room.round;
      sentRef.current = -1;
      filledRef.current = Array(q.answer.length).fill(null);
      setFilled(filledRef.current);
    }
    const me = d.players.find((p) => p.token === d.room.meToken) ?? d.players[0];
    if (d.room.state === "reveal" && d.room.roundResult && revealSeen.current !== d.room.round && me) {
      revealSeen.current = d.room.round;
      const won = d.room.roundResult.winner === me.seat;
      sfx(won ? "good" : "bad");
      shake(won ? 8 : 12);
      burstEl(document.getElementById("seat-0"), { color: won ? "#33E0D0" : "#FF4D3D", count: 40, angle: -Math.PI / 2, spread: Math.PI * 1.3 });
    }
    if (d.room.state === "over") {
      const foe = d.players.find((p) => p.token !== me?.token);
      if (me) {
        const fs = foe?.score ?? 0;
        const winner = !foe || me.hp === foe.hp ? (me.score === fs ? null : me.score > fs ? 0 : 1) : me.hp > foe.hp ? 0 : 1;
        setStats({
          score: me.score, correct: me.correct, answered: me.answered, bestCombo: me.bestCombo, streak: me.streak,
          round: d.room.round + 1, total: d.room.totalRounds, hp: me.hp, foeHp: foe?.hp ?? 0, winner,
        });
      }
      setScreen("over");
    } else if (d.room.state === "playing" || d.room.state === "reveal") setScreen("match");
  }, []);

  useEffect(() => {
    if (!code || !token || screen === "over") return;
    let alive = true;
    const tick = async () => {
      const d = await call({ action: "state", code, token });
      if (alive && d?.ok) ingest(d);
    };
    void tick();
    const id = setInterval(() => void tick(), screen === "lobby" ? 1000 : 420);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [code, token, ingest, screen]);

  const host = async () => {
    setBusy(true);
    setErr("");
    const d = await call({ action: "create", name, topic: dbId, difficulty: tier });
    setBusy(false);
    if (d?.ok) {
      setCode(d.code);
      setToken(d.token);
      setScreen("lobby");
    } else setErr(errText(d));
  };
  const join = async () => {
    setBusy(true);
    setErr("");
    const d = await call({ action: "join", code: codeIn.toUpperCase(), name });
    setBusy(false);
    if (d?.ok) {
      setCode(d.code);
      setToken(d.token);
      setScreen("lobby");
    } else setErr(errText(d));
  };
  const start = async () => {
    setBusy(true);
    const d = await call({ action: "start", code, token });
    setBusy(false);
    if (d?.ok) setScreen("match");
    else setErr(errText(d));
  };
  const leave = () => {
    if (token) void call({ action: "leave", token });
    onExit();
  };

  const q = room?.question ?? null;
  const hand: string[] = q ? q.options.slice(0, 5) : [];

  const pick = (tk: string) => {
    if (!q || !room || room.state !== "playing" || sentRef.current === room.round) return;
    const next = [...filledRef.current];
    let idx = next.indexOf(null);
    if (idx === -1) idx = next.length - 1;
    const dup = next.indexOf(tk);
    if (dup !== -1 && dup !== idx) next[dup] = null;
    next[idx] = tk;
    filledRef.current = next;
    setFilled(next);
    sfx("card");
    if (next.every((x) => x != null)) {
      sentRef.current = room.round;
      sfx("seat");
      void call({ action: "answer", code, token, cards: next, ms: Math.max(0, Date.now() - room.roundStartedAt) });
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen !== "match") return;
      const i = ["1", "2", "3", "4", "5"].indexOf(e.key);
      if (i >= 0 && hand[i]) {
        e.preventDefault();
        pick(hand[i]);
      }
      if (e.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const me = players.find((p) => p.token === (room?.meToken ?? token));
  const foe = players.find((p) => p.token !== (room?.meToken ?? token));
  const mySeat = me?.seat ?? 0;
  const foeSeat = 1 - mySeat;
  const reveal = room?.state === "reveal" ? room.roundResult : null;
  const diff = room?.difficulty ?? tier;
  const limit = TIER_META[diff].limit;
  const dbName = DB_BY_ID[room?.topic ?? dbId]?.name ?? "";
  const tierName = t(`tier.${diff}` as DictKey);
  const inputCls =
    "mt-1 w-full rounded-[2px] border border-[#3C454E] bg-[#0E1114] px-3 py-2.5 font-mono text-[13px] font-bold uppercase tracking-[0.18em] text-[#FFB627] outline-none placeholder:text-[#3C454E] focus:border-[#FFB627]";

  if (screen === "over" && stats) {
    return <GameOver stats={stats} mode="online" game="duel" tier={diff} dbId={room?.topic ?? dbId} onRestart={leave} onHome={leave} />;
  }

  if (screen === "form") {
    return (
      <Shell onExit={leave} legend={t("net.legend")}>
        <Panel className="p-6" legend={t("net.open")}>
          <p className="font-serif text-[17px] italic leading-snug text-[#8C9AA5]">{t("net.intro", { db: DB_BY_ID[dbId]?.name ?? "", tier: tierName })}</p>
          <label className="mt-5 block">
            <Legend>{t("over.callsign")}</Legend>
            <input value={name} maxLength={10} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="OPERATOR" className={inputCls} />
          </label>
          <div className="mt-5">
            <Btn tone="amber" onClick={host} disabled={busy}>
              <Icon name="wifi" size={15} /> {t("net.host")}
            </Btn>
          </div>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#2A3138]" />
            <Legend>{t("net.orJoin")}</Legend>
            <span className="h-px flex-1 bg-[#2A3138]" />
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input
              value={codeIn}
              maxLength={5}
              onChange={(e) => setCodeIn(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") void join();
              }}
              placeholder={t("net.code")}
              className="flex-1 rounded-[2px] border border-[#3C454E] bg-[#0E1114] px-3 py-2.5 text-center font-mono text-[18px] font-bold uppercase tracking-[0.4em] text-[#33E0D0] outline-none placeholder:text-[12px] placeholder:tracking-[0.2em] placeholder:text-[#3C454E] focus:border-[#33E0D0]"
            />
            <Btn tone="cyan" onClick={join} disabled={busy || codeIn.length < 5}>
              <Icon name="chevron" size={15} /> {t("net.join")}
            </Btn>
          </div>
          {err ? <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#FF4D3D]">{err}</p> : null}
        </Panel>
      </Shell>
    );
  }

  if (screen === "lobby") {
    return (
      <Shell onExit={leave} legend={`${t("net.room", { code })} // ${dbName} · ${tierName}`}>
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel className="p-7 text-center" legend={t("net.invite")}>
            <div className="font-display text-[clamp(3rem,14vw,6.5rem)] font-bold leading-none tracking-[0.12em] text-[#FFB627]" style={{ textShadow: "0 0 60px rgba(255,182,39,.35)" }}>
              {code}
            </div>
            <p className="mt-3 font-serif text-[16px] italic text-[#8C9AA5]">{t("net.inviteSub")}</p>
            <div
              className={`mt-5 inline-flex items-center gap-2 rounded-[2px] border px-3 py-1.5 ${players.length < 2 ? "border-[#FFB627]/30 bg-[#FFB627]/8" : "border-[#33E0D0]/40 bg-[#33E0D0]/10"}`}
            >
              <span className={`h-2 w-2 rounded-full ${players.length < 2 ? "animate-pulse bg-[#FFB627]" : "bg-[#33E0D0]"}`} />
              <Legend tone={players.length < 2 ? "amber" : "cyan"}>{t(players.length < 2 ? "net.waiting" : "net.full")}</Legend>
            </div>
          </Panel>
          <Panel className="p-5" legend={t("net.roster")}>
            <ul className="flex flex-col gap-2">
              {[0, 1].map((s) => {
                const p = players.find((x) => x.seat === s);
                return (
                  <li key={s} className="flex items-center gap-3 rounded-[2px] border border-[#333B44] bg-[#0E1114] px-3 py-3">
                    <span className="font-mono text-[10px] font-bold text-[#5A6772]">S{s + 1}</span>
                    <span className="flex-1 truncate font-mono text-[13px] font-bold uppercase tracking-[0.14em] text-[#E6EDF2]">{p ? p.name : t("net.vacant")}</span>
                    {p?.isHost ? <Legend tone="amber">{t("net.hostTag")}</Legend> : null}
                    {p ? <Icon name="check" size={14} /> : <span className="h-2 w-2 animate-pulse rounded-full bg-[#5A6772]" />}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.14em] text-[#5A6772]">{t("net.botNote")}</p>
            <div className="mt-4">
              {me?.isHost ? (
                <Btn tone="amber" onClick={start} disabled={busy}>
                  <Icon name="bolt" size={15} /> {t("net.begin")}
                </Btn>
              ) : (
                <Legend>{t("net.hostStarts")}</Legend>
              )}
            </div>
            {err ? <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#FF4D3D]">{err}</p> : null}
          </Panel>
        </div>
      </Shell>
    );
  }

  const sent = sentRef.current === room?.round;
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#131619]">
      <GameHeader
        info={`${t("net.room", { code })} // ${dbName} · ${tierName}`}
        sub={`${me?.name ?? "—"} vs ${foe?.name ?? "—"}`}
        score={me?.score ?? 0}
        round={(room?.round ?? 0) + 1}
        total={room?.totalRounds ?? 0}
        onExit={leave}
      />
      {q ? (
        <>
          <TaskBand
            legend={t("duel.statement", { n: String((room?.round ?? 0) + 1).padStart(2, "0") })}
            right={t("hud.blanks", { n: q.answer.length })}
            brief={tx(q.brief, locale)}
            footer={
              <div className="mt-3 min-h-[34px]">
                {reveal ? (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-start gap-3">
                    <span
                      className="mt-[3px] shrink-0 rounded-[2px] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#EDE6D8]"
                      style={{ background: reveal.winner === mySeat ? "#0F8C82" : reveal.winner == null ? "#46535D" : "#9A5B2F" }}
                    >
                      {t(reveal.winner === mySeat ? "duel.won" : reveal.winner == null ? "duel.bothFailed" : "duel.lost")}
                    </span>
                    <p className="font-serif text-[15px] italic leading-snug text-[#8C9AA5] sm:text-[17px]">{tx(q.why, locale)}</p>
                  </motion.div>
                ) : (
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#5A6772]">{t("net.hint")}</p>
                )}
              </div>
            }
          >
            <div className="mt-4 rounded-[3px] border border-[#FFB627]/20 bg-[#131619]/80 px-4 py-4 sm:px-6">
              <QueryBoard question={q} filled={reveal ? reveal.played[mySeat] ?? [] : filled} reveal={!!reveal} />
            </div>
          </TaskBand>

          <div className="grid grid-cols-2 items-start gap-3 px-3 py-3 sm:px-5 lg:grid-cols-[1fr_260px_1fr] lg:gap-6">
            <div id="seat-0">
              <HpBar hp={me?.hp ?? 100} label={`${me?.name ?? t("duel.you")}`} tone="#FFB627" />
              <div className="mt-2 flex gap-1">
                {filled.map((f, i) => (
                  <div key={i} className="max-w-[110px] flex-1">
                    <ClauseCard token={f ?? "—"} state={f ? "picked" : "spent"} small showGloss={false} />
                  </div>
                ))}
              </div>
            </div>
            <div className="order-last col-span-2 lg:order-none lg:col-span-1 lg:mt-1">
              <ClockBar limit={limit} deadline={(room?.roundStartedAt ?? Date.now()) + limit} runId={room?.round ?? 0} paused={room?.state !== "playing"} />
              <div className="mt-2 flex justify-center">
                <ComboChip combo={me?.combo ?? 0} streak={me?.streak ?? 0} />
              </div>
              {reveal ? (
                <div className="mt-3 text-center">
                  <div className="font-display text-[30px] font-bold leading-none" style={{ color: reveal.winner === mySeat ? "#33E0D0" : "#FF4D3D" }}>
                    {t(reveal.crit[mySeat] ? "duel.optimized" : reveal.winner === mySeat ? "duel.executed" : reveal.winner == null ? "duel.rollback" : "duel.rejected")}
                  </div>
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#5A6772]">
                    {reveal.points[mySeat] > 0 ? t("duel.pts", { n: reveal.points[mySeat] }) : t("duel.noRows")}
                  </div>
                </div>
              ) : null}
            </div>
            <div id="seat-1" className="text-right">
              <HpBar hp={foe?.hp ?? 100} label={`${foe?.name ?? t("duel.opponent")} // ${t(foe?.isBot ? "duel.cpu" : "duel.remote")}`} tone="#8C9AA5" align="right" />
              <div className="mt-2 flex justify-end gap-1">
                {(reveal?.played[foeSeat] ?? Array(q.answer.length).fill(null)).map((f: string | null, i: number) => (
                  <div key={i} className="max-w-[110px] flex-1">
                    <ClauseCard token={f ?? "—"} state={f ? (reveal ? "reveal" : "picked") : "spent"} small showGloss={false} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto border-t border-[#272D34] bg-[#0E1114] px-3 py-3 sm:px-5">
            <div className="mx-auto max-w-5xl">
              <Hand cards={hand} filled={filled} onPick={pick} disabled={sent || room?.state !== "playing"} label={t("duel.handYou")} tone="amber" />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <Legend>{t("net.keys")}</Legend>
                <Legend>{t(sent ? "net.sent" : "net.seat")}</Legend>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid flex-1 place-items-center">
          <Legend>{t("net.awaiting")}</Legend>
        </div>
      )}
    </div>
  );
}

function Shell({ children, onExit, legend }: { children: React.ReactNode; onExit: () => void; legend: string }) {
  const { t } = useI18n();
  return (
    <div className="relative min-h-[100dvh] bg-[#131619] px-4 py-6 sm:px-8" style={{ backgroundImage: "url(images/steel.jpg)", backgroundSize: "cover" }}>
      <div aria-hidden className="absolute inset-0 bg-[#131619]/92" />
      <div className="relative mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <Mark size={34} />
          <Legend>{legend}</Legend>
          <span className="flex-1" />
          <button onClick={onExit} className="rounded-[2px] border border-[#333B44] p-2 text-[#8C9AA5] hover:border-[#FFB627] hover:text-[#FFB627]" title={t("net.leave")}>
            <Icon name="x" size={16} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

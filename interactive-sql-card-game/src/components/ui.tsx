"use client";

import { CARD_GLOSS, CARD_KIND, KIND_LABEL, kindOfBlock, type CardKind } from "@/content";
import { LOCALES, tx, useI18n } from "@/i18n";

/* ── ink palette for the printed card deck ───────────────────────────────── */
const KIND_INK: Record<CardKind, string> = {
  dml: "#1A1714",
  clause: "#B87A08",
  func: "#0F8C82",
  pred: "#9A5B2F",
  op: "#46535D",
};

/* ── the mark: a punched operator card with a prompt chevron ─────────────── */
export function Mark({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Query Clash"
    >
      <defs>
        <linearGradient id="mk-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD27A" />
          <stop offset="1" stopColor="#FFB627" />
        </linearGradient>
      </defs>
      <path
        d="M8 18 L22 4 H50 A6 6 0 0 1 56 10 V54 A6 6 0 0 1 50 60 H14 A6 6 0 0 1 8 54 Z"
        fill="url(#mk-a)"
      />
      <path
        d="M8 18 L22 4 H50 A6 6 0 0 1 56 10 V54 A6 6 0 0 1 50 60 H14 A6 6 0 0 1 8 54 Z"
        fill="none"
        stroke="#131619"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M20 25 L32 35 L20 45" fill="none" stroke="#131619" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M36 45 H49" fill="none" stroke="#131619" strokeWidth="5.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── inline icon set (no emoji) ──────────────────────────────────────────── */
export function Icon({
  name,
  size = 18,
  className = "",
}: {
  name:
    | "cart" | "film" | "ball" | "cross" | "rocket"
    | "bolt" | "clock" | "trophy" | "skull" | "pause"
    | "play" | "restart" | "home" | "sound" | "mute"
    | "users" | "monitor" | "wifi" | "chevron" | "check" | "x"
    | "book" | "cap" | "bank" | "help" | "heart" | "blocks" | "keyboard" | "cards" | "globe" | "undo" | "trash" | "db";
  size?: number;
  className?: string;
}) {
  const c = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (name) {
    case "cart":
      return <svg {...c}><path d="M3 4h2.2l2.3 10.2h9.6l2.1-7.4H6.4" /><circle cx="9.5" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></svg>;
    case "film":
      return <svg {...c}><rect x="2.5" y="4.5" width="19" height="15" rx="2" /><path d="M7 4.5v15M17 4.5v15M2.5 12h19M2.5 8.2h4.5M2.5 15.8h4.5M17 8.2h4.5M17 15.8h4.5" /></svg>;
    case "ball":
      return <svg {...c}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.4l3.6 2.6-1.4 4.2H9.8L8.4 10z" /><path d="M12 3.5v3.9M4.2 9.6l2.8.8M19.8 9.6l-2.8.8M7.4 19.4l1.6-3M16.6 19.4l-1.6-3" /></svg>;
    case "cross":
      return <svg {...c}><path d="M10 3.5h4v6.5h6.5v4H14v6.5h-4V14H3.5v-4H10z" /></svg>;
    case "rocket":
      return <svg {...c}><path d="M12 2.6c3.2 2.4 5 6 5 10.2l-2.4 3.4H9.4L7 12.8C7 8.6 8.8 5 12 2.6z" /><circle cx="12" cy="10.4" r="1.8" /><path d="M9.4 16.2L7 21l3-1.4M14.6 16.2L17 21l-3-1.4M12 21v-3.4" /></svg>;
    case "bolt":
      return <svg {...c}><path d="M13.5 2.5L5 13.6h5.6L9.8 21.5 19 10.2h-5.8z" /></svg>;
    case "clock":
      return <svg {...c}><circle cx="12" cy="12" r="8.6" /><path d="M12 7v5.2l3.4 2" /></svg>;
    case "trophy":
      return <svg {...c}><path d="M7 3.5h10v5a5 5 0 01-10 0z" /><path d="M7 5H4.2v1.6A3.4 3.4 0 007.6 10M17 5h2.8v1.6A3.4 3.4 0 0116.4 10" /><path d="M12 13.5v3.2M8.6 20.5h6.8l-1-3.8H9.6z" /></svg>;
    case "skull":
      return <svg {...c}><path d="M5.5 10.5a6.5 6.5 0 1113 0c0 2.4-1.2 3.6-1.2 5.2v1.6H6.7v-1.6c0-1.6-1.2-2.8-1.2-5.2z" /><circle cx="9.6" cy="11" r="1.2" /><circle cx="14.4" cy="11" r="1.2" /><path d="M12 14v2M9.5 20.5v-2M14.5 20.5v-2" /></svg>;
    case "pause":
      return <svg {...c}><path d="M9 5v14M15 5v14" /></svg>;
    case "play":
      return <svg {...c}><path d="M7.5 4.8L19 12 7.5 19.2z" /></svg>;
    case "restart":
      return <svg {...c}><path d="M20 12a8 8 0 11-2.6-5.9" /><path d="M20.5 3.6v5.2h-5.2" /></svg>;
    case "home":
      return <svg {...c}><path d="M3.6 10.6L12 3.5l8.4 7.1" /><path d="M5.8 12.4v8h12.4v-8" /><path d="M10 20.4v-5h4v5" /></svg>;
    case "sound":
      return <svg {...c}><path d="M4 9.4h3.4L12 5.4v13.2L7.4 14.6H4z" /><path d="M15.6 9.2a4 4 0 010 5.6M18.2 6.6a7.6 7.6 0 010 10.8" /></svg>;
    case "mute":
      return <svg {...c}><path d="M4 9.4h3.4L12 5.4v13.2L7.4 14.6H4z" /><path d="M16 9.6l4.6 4.8M20.6 9.6L16 14.4" /></svg>;
    case "users":
      return <svg {...c}><circle cx="9" cy="8.4" r="3.2" /><path d="M3.4 19.6c0-3 2.5-5.2 5.6-5.2s5.6 2.2 5.6 5.2" /><path d="M16 6.2a3 3 0 010 5.9M17.4 14.8c2.2.6 3.7 2.4 3.7 4.8" /></svg>;
    case "monitor":
      return <svg {...c}><rect x="2.6" y="4.4" width="18.8" height="12.4" rx="1.8" /><path d="M9 20.4h6M12 16.8v3.6" /></svg>;
    case "wifi":
      return <svg {...c}><path d="M2.6 8.8a14 14 0 0118.8 0M6 12.4a9 9 0 0112 0M9.4 16a4.2 4.2 0 015.2 0" /><circle cx="12" cy="19.4" r="1" /></svg>;
    case "chevron":
      return <svg {...c}><path d="M9 5l7 7-7 7" /></svg>;
    case "check":
      return <svg {...c}><path d="M4.5 12.6l5 5 10-11" /></svg>;
    case "x":
      return <svg {...c}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "book":
      return <svg {...c}><path d="M4 4.5h6a2 2 0 012 2v13a2 2 0 00-2-2H4z" /><path d="M20 4.5h-6a2 2 0 00-2 2v13a2 2 0 012-2h6z" /></svg>;
    case "cap":
      return <svg {...c}><path d="M2.5 9.5L12 5l9.5 4.5L12 14z" /><path d="M6.5 11.6v4.2c1.4 1.4 3.3 2.2 5.5 2.2s4.1-.8 5.5-2.2v-4.2M21.5 9.5v5" /></svg>;
    case "bank":
      return <svg {...c}><path d="M3 9.2L12 4l9 5.2H3z" /><path d="M5.5 9.5v8M10 9.5v8M14 9.5v8M18.5 9.5v8M3 20h18" /></svg>;
    case "help":
      return <svg {...c}><circle cx="12" cy="12" r="8.6" /><path d="M9.6 9.4a2.5 2.5 0 014.8.9c0 1.7-2.4 2.1-2.4 3.6" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></svg>;
    case "heart":
      return <svg {...c}><rect x="5" y="5" width="14" height="14" rx="1.5" /><path d="M9 12h6M12 9v6" /></svg>;
    case "blocks":
      return <svg {...c}><rect x="3" y="5" width="7" height="5" rx="1" /><rect x="12" y="5" width="9" height="5" rx="1" /><rect x="3" y="14" width="11" height="5" rx="1" /><rect x="16" y="14" width="5" height="5" rx="1" /></svg>;
    case "keyboard":
      return <svg {...c}><rect x="2.5" y="6" width="19" height="12" rx="1.8" /><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M6.5 14h11" /></svg>;
    case "cards":
      return <svg {...c}><rect x="3.5" y="6" width="10" height="14" rx="1.5" /><path d="M8 4h9.5A1.5 1.5 0 0119 5.5V17" /></svg>;
    case "globe":
      return <svg {...c}><circle cx="12" cy="12" r="8.6" /><path d="M3.4 12h17.2M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6S9.6 5.8 12 3.4z" /></svg>;
    case "undo":
      return <svg {...c}><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" /></svg>;
    case "trash":
      return <svg {...c}><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></svg>;
    case "db":
      return <svg {...c}><ellipse cx="12" cy="5.8" rx="7.5" ry="2.8" /><path d="M4.5 5.8v12.4c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V5.8M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" /></svg>;
  }
}

/* ── silkscreened console legend ─────────────────────────────────────────── */
export function Legend({
  children,
  className = "",
  tone = "dim",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "dim" | "amber" | "cyan" | "red";
}) {
  const c =
    tone === "amber" ? "text-[#FFB627]" : tone === "cyan" ? "text-[#33E0D0]" : tone === "red" ? "text-[#FF4D3D]" : "text-[#8C9AA5]";
  return (
    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.28em] ${c} ${className}`}>
      {children}
    </span>
  );
}

/* ── raised steel panel ──────────────────────────────────────────────────── */
export function Panel({
  children,
  className = "",
  legend,
}: {
  children: React.ReactNode;
  className?: string;
  legend?: string;
}) {
  return (
    <section
      style={{ backgroundImage: "url(images/steel.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
      className={`relative rounded-[3px] border border-[#333B44] bg-[#1C2126] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.5)] ${className}`}
    >
      <div className="absolute inset-0 bg-[#1C2126]/88" aria-hidden />
      <div className="relative">{children}</div>
      {legend ? (
        <div className="pointer-events-none absolute -top-[7px] left-4 bg-[#131619] px-2">
          <Legend>{legend}</Legend>
        </div>
      ) : null}
    </section>
  );
}

/* ── console button ──────────────────────────────────────────────────────── */
export function Btn({
  children,
  onClick,
  tone = "steel",
  className = "",
  kbd,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "steel" | "amber" | "cyan" | "ghost";
  className?: string;
  kbd?: string;
  disabled?: boolean;
  title?: string;
}) {
  const tones: Record<string, string> = {
    steel:
      "bg-[#272D34] text-[#E6EDF2] border-[#3C454E] hover:bg-[#323A43] hover:border-[#FFB627]/60",
    amber:
      "bg-[#FFB627] text-[#131619] border-[#FFD27A] hover:bg-[#FFD27A] shadow-[0_0_28px_rgba(255,182,39,0.28)]",
    cyan: "bg-[#33E0D0] text-[#0B1A19] border-[#7BF0E5] hover:bg-[#7BF0E5]",
    ghost:
      "bg-transparent text-[#8C9AA5] border-[#333B44] hover:text-[#E6EDF2] hover:border-[#8C9AA5]",
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`group relative inline-flex items-center justify-center gap-2.5 rounded-[3px] border px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.22em] transition-all duration-150 active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB627] focus-visible:ring-offset-2 focus-visible:ring-offset-[#131619] ${tones[tone]} ${className}`}
    >
      {children}
      {kbd ? (
        <kbd className="ml-1 rounded-[2px] border border-current/30 px-1.5 py-0.5 text-[10px] opacity-60">
          {kbd}
        </kbd>
      ) : null}
    </button>
  );
}

/* ── printed clause card ─────────────────────────────────────────────────── */
export function ClauseCard({
  token,
  index,
  state = "idle",
  onClick,
  small,
  showGloss = true,
}: {
  token: string;
  index?: number;
  state?: "idle" | "picked" | "spent" | "wrong" | "reveal";
  onClick?: () => void;
  small?: boolean;
  showGloss?: boolean;
}) {
  const { locale } = useI18n();
  const kind = CARD_KIND[token] ?? "clause";
  const ink = KIND_INK[kind];
  const Wrapper = onClick ? "button" : "div";
  const ring =
    state === "picked"
      ? "ring-[3px] ring-[#FFB627] -translate-y-2 shadow-[0_18px_36px_rgba(0,0,0,0.6)]"
      : state === "reveal"
        ? "ring-[3px] ring-[#33E0D0]"
        : state === "wrong"
          ? "ring-[3px] ring-[#FF4D3D]"
          : state === "spent"
            ? "opacity-25 saturate-0"
            : "";
  return (
    <Wrapper
      {...(onClick ? { onClick, type: "button" as const } : {})}
      style={{ backgroundImage: "url(images/cardstock.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
      className={`relative block select-none overflow-hidden rounded-[4px] text-left transition-[transform,box-shadow,opacity] duration-150 ease-[cubic-bezier(.2,1.5,.4,1)] bg-[#EDE6D8] shadow-[0_6px_16px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(26,23,20,0.18)] ${ring} ${onClick ? "cursor-pointer hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#FFB627]" : ""} ${small ? "w-[112px] min-h-[86px]" : "w-full min-h-[112px]"}`}
    >
      <span
        className="absolute inset-0 bg-[#EDE6D8]/70 mix-blend-lighten"
        aria-hidden
      />
      <span className="relative flex h-full flex-col p-2.5">
        <span className="flex items-center justify-between">
          <span
            className="rounded-[1px] px-1.5 py-[3px] font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#EDE6D8]"
            style={{ background: ink }}
          >
            {tx(KIND_LABEL[kind], locale)}
          </span>
          {typeof index === "number" ? (
            <span className="grid h-[18px] w-[18px] place-items-center rounded-[2px] border border-[#1A1714]/40 font-mono text-[10px] font-bold text-[#1A1714]">
              {index}
            </span>
          ) : null}
        </span>
        <span
          className={`mt-2 break-words font-mono font-bold leading-[1.05] tracking-tight text-[#1A1714] ${small ? "text-[12px] sm:text-[13px]" : token.length > 7 ? "text-[13px] sm:text-[17px]" : "text-[16px] sm:text-[23px]"}`}
        >
          {token}
        </span>
        {showGloss ? (
          <span className="mt-auto hidden pt-2 font-mono text-[8.5px] leading-[1.35] text-[#1A1714]/55 sm:block">
            {tx(CARD_GLOSS[token], locale)}
          </span>
        ) : null}
        {/* registration marks */}
        <span className="pointer-events-none absolute bottom-1 right-1 h-2 w-2 border-b border-r border-[#1A1714]/25" aria-hidden />
        <span className="pointer-events-none absolute left-1 top-9 h-2 w-2 border-l border-t border-[#1A1714]/25" aria-hidden />
      </span>
    </Wrapper>
  );
}

/* ── builder block: a printed strip of card stock ────────────────────────── */
export function BlockChip({
  text,
  index,
  onClick,
  state = "idle",
  focused,
  placed,
}: {
  text: string;
  index?: number;
  onClick?: () => void;
  state?: "idle" | "good" | "bad" | "ghost";
  focused?: boolean;
  placed?: boolean;
}) {
  const ink = KIND_INK[kindOfBlock(text)];
  const Wrapper = onClick ? "button" : "div";
  const ring =
    state === "good"
      ? "ring-2 ring-[#33E0D0]"
      : state === "bad"
        ? "ring-2 ring-[#FF4D3D]"
        : focused
          ? "ring-[3px] ring-[#FFB627] -translate-y-1"
          : "";
  if (placed) {
    return (
      <Wrapper
        {...(onClick ? { onClick, type: "button" as const } : {})}
        className={`inline-flex items-center rounded-[3px] border-2 px-2 py-[5px] font-mono text-[13px] font-bold tracking-tight transition-all duration-150 ease-[cubic-bezier(.2,1.6,.4,1)] sm:text-[15px] ${
          state === "bad"
            ? "border-[#FF4D3D] bg-[#FF4D3D]/15 text-[#FF8A7E]"
            : state === "good"
              ? "border-[#33E0D0] bg-[#33E0D0]/15 text-[#33E0D0]"
              : "border-[#B87A08] bg-[#FFB627] text-[#1A1714] shadow-[0_2px_0_#8A5B06] hover:bg-[#FFD27A]"
        } ${onClick ? "cursor-pointer active:translate-y-[1px]" : ""}`}
      >
        {text}
      </Wrapper>
    );
  }
  return (
    <Wrapper
      {...(onClick ? { onClick, type: "button" as const } : {})}
      style={{ backgroundImage: "url(images/cardstock.jpg)", backgroundSize: "cover" }}
      className={`relative inline-flex select-none items-stretch overflow-hidden rounded-[3px] bg-[#EDE6D8] text-left shadow-[0_5px_12px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(26,23,20,0.18)] transition-[transform,opacity,box-shadow] duration-150 ease-[cubic-bezier(.2,1.5,.4,1)] ${ring} ${
        state === "ghost" ? "pointer-events-none opacity-20 saturate-0" : ""
      } ${onClick ? "cursor-pointer hover:-translate-y-1 active:translate-y-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#FFB627]" : ""}`}
    >
      <span aria-hidden className="absolute inset-0 bg-[#EDE6D8]/70" />
      <span className="relative w-[5px] shrink-0" style={{ background: ink }} aria-hidden />
      <span className="relative flex items-center gap-2 px-2.5 py-2">
        {typeof index === "number" && index < 9 ? (
          <span className="grid h-[16px] w-[16px] shrink-0 place-items-center rounded-[2px] border border-[#1A1714]/35 font-mono text-[9px] font-bold text-[#1A1714]/70">
            {index + 1}
          </span>
        ) : null}
        <span className="font-mono text-[12.5px] font-bold leading-tight tracking-tight text-[#1A1714] sm:text-[14px]">
          {text}
        </span>
      </span>
    </Wrapper>
  );
}

/* ── language switch — segmented console toggle ──────────────────────────── */
export function LangSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      role="radiogroup"
      aria-label={t("app.language")}
      className="flex items-center overflow-hidden rounded-[2px] border border-[#333B44] bg-[#0E1114]"
    >
      <span className="px-2 text-[#5A6772]">
        <Icon name="globe" size={14} />
      </span>
      {LOCALES.map((l) => (
        <button
          key={l.id}
          role="radio"
          aria-checked={locale === l.id}
          title={l.name}
          onClick={() => setLocale(l.id)}
          className={`px-2.5 py-1.5 font-mono text-[10.5px] font-bold tracking-[0.16em] transition-colors ${
            locale === l.id ? "bg-[#FFB627] text-[#131619]" : "text-[#8C9AA5] hover:text-[#E6EDF2]"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

/* ── health / integrity bar ──────────────────────────────────────────────── */
export function HpBar({
  hp,
  label,
  right,
  tone = "#FFB627",
  align = "left",
}: {
  hp: number;
  label: string;
  right?: React.ReactNode;
  tone?: string;
  align?: "left" | "right";
}) {
  const pct = Math.max(0, Math.min(100, hp));
  const critical = pct <= 30;
  return (
    <div className="w-full">
      <div className={`flex items-baseline justify-between gap-3 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <Legend tone={critical ? "red" : "dim"}>{label}</Legend>
        <span className="font-mono text-[12px] font-bold tabular-nums text-[#E6EDF2]">
          {Math.max(0, Math.round(hp))}
          <span className="text-[#5A6772]">/100</span>
          {right}
        </span>
      </div>
      <div
        className={`mt-1.5 h-[9px] overflow-hidden rounded-[1px] border border-[#333B44] bg-[#0E1114] ${align === "right" ? "rotate-180" : ""}`}
      >
        <div
          className="h-full transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: critical ? "#FF4D3D" : tone,
            boxShadow: `0 0 12px ${critical ? "#FF4D3D" : tone}88`,
          }}
        />
      </div>
    </div>
  );
}

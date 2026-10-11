// Forgiving SQL comparison for the Rapid Query mode.
// Case, whitespace, trailing semicolons, default ASC, INNER/OUTER noise words,
// != vs <>, smart quotes and `AS` before a table alias are all normalized away.

const TOKEN_RE = /'(?:[^']|'')*'|\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_*][A-Za-z0-9_]*)?|<>|<=|>=|!=|\S/g;

export function tokenize(sql: string): string[] {
  const s = sql
    .replace(/[\u2018\u2019\u00AB\u00BB\u201C\u201D]/g, "'")
    .replace(/\u2014|\u2013/g, "-");
  return s.match(TOKEN_RE) ?? [];
}

export function normalize(sql: string): string[] {
  const raw = tokenize(sql).map((tk) => (tk.startsWith("'") ? tk : tk.toLowerCase()));
  const out: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    let tk = raw[i];
    if (tk === "!=") tk = "<>";
    if (tk === "inner" && raw[i + 1] === "join") continue;
    if (tk === "outer" && raw[i - 1] === "left" && raw[i + 1] === "join") continue;
    if (tk === "asc") {
      const nx = raw[i + 1];
      if (nx === undefined || nx === "," || nx === ")" || nx === "limit" || nx === ";") continue;
    }
    // FROM table AS t / JOIN table AS t  →  drop AS
    if (tk === "as" && i >= 2 && (raw[i - 2] === "from" || raw[i - 2] === "join")) continue;
    out.push(tk);
  }
  while (out.length && out[out.length - 1] === ";") out.pop();
  return out;
}

export function sameQuery(a: string, b: string) {
  const x = normalize(a);
  const y = normalize(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

export type MatchReport = {
  ok: boolean;
  /** leading tokens that match the closest reference */
  prefix: number;
  total: number;
  /** first differing token as typed (or null when the statement is simply incomplete) */
  near: string | null;
};

export function checkQuery(typed: string, references: string[]): MatchReport {
  const t = normalize(typed);
  let best: MatchReport = { ok: false, prefix: 0, total: 1, near: null };
  let bestScore = -1;
  for (const ref of references) {
    const r = normalize(ref);
    let p = 0;
    while (p < t.length && p < r.length && t[p] === r[p]) p++;
    const ok = p === r.length && p === t.length;
    const score = ok ? Infinity : p / r.length;
    if (score > bestScore) {
      bestScore = score;
      best = { ok, prefix: p, total: r.length, near: p < t.length ? t[p] : null };
    }
  }
  return best;
}

/** live meter: how many leading tokens of the reference are already correct */
export function liveProgress(typed: string, reference: string) {
  const t = normalize(typed);
  const r = normalize(reference);
  let p = 0;
  while (p < t.length && p < r.length && t[p] === r[p]) p++;
  // a half-typed last token shouldn't count as wrong
  return { prefix: p, total: r.length, wrongTail: t.length > p + 1 };
}

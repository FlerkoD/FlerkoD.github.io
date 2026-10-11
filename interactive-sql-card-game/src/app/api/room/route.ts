import { NextResponse } from "next/server";
import { and, eq, lt, asc } from "drizzle-orm";
import { db } from "@/db";
import { roomPlayers, rooms, type RoundResult, type RoomPlayer } from "@/db/schema";
import { DB_BY_ID, TIER_META } from "@/content";
import { buildDeck, cpuCards, critThreshold, dealHand, isCorrect, scoreFor } from "@/game/engine";

export const dynamic = "force-dynamic";

const LIMIT = (tier: number) => TIER_META[tier]?.limit ?? 9000;
const DAMAGE = (tier: number) => TIER_META[tier]?.damage ?? 18;
const REVEAL_MS = 3400;
const TWO_HOURS = 2 * 60 * 60 * 1000;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function makeCode() {
  let s = "";
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}
const tok = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/** deterministic 0..1 from a seed — used so a bot behaves the same on every poll */
function hash01(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

async function playersOf(roomId: number): Promise<RoomPlayer[]> {
  return db.select().from(roomPlayers).where(eq(roomPlayers.roomId, roomId)).orderBy(asc(roomPlayers.seat));
}

type Body = Record<string, unknown>;
const str = (b: Body, k: string) => String(b[k] ?? "").trim().slice(0, 40);

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const action = str(body, "action");

  try {
    switch (action) {
      case "create":
        return await createRoom(body);
      case "join":
        return await joinRoom(body);
      case "start":
        return await startMatch(body);
      case "answer":
        return await answer(body);
      case "state":
        return await roomState(body);
      case "leave":
        return await leave(body);
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("room api", err);
    return NextResponse.json({ error: "server error", code: "generic" }, { status: 500 });
  }
}

// ── create ──────────────────────────────────────────────────────────────────

async function createRoom(body: Body) {
  const name = str(body, "name") || "OPERATOR-1";
  const rawTopic = str(body, "topic");
  const topic = DB_BY_ID[rawTopic] ? rawTopic : "northwind";
  const difficulty = Math.min(3, Math.max(1, Number(body.difficulty) || 1));
  const now = Date.now();

  await db.delete(rooms).where(lt(rooms.updatedAt, now - TWO_HOURS));

  let code = makeCode();
  for (let i = 0; i < 6; i++) {
    const existing = await db.select().from(rooms).where(eq(rooms.code, code));
    if (!existing.length) break;
    code = makeCode();
  }

  const tier = TIER_META[difficulty].rounds;
  const deck = buildDeck(topic, difficulty as 1 | 2 | 3, tier);

  const [room] = await db
    .insert(rooms)
    .values({
      code,
      hostName: name,
      topic,
      difficulty,
      state: "lobby",
      round: 0,
      totalRounds: deck.length,
      deck,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const token = tok();
  await db.insert(roomPlayers).values({
    roomId: room.id,
    token,
    name,
    isHost: true,
    seat: 0,
    seenAt: now,
  });

  return NextResponse.json({ ok: true, code, token });
}

// ── join ────────────────────────────────────────────────────────────────────

async function joinRoom(body: Body) {
  const code = str(body, "code").toUpperCase();
  const name = str(body, "name") || "OPERATOR-2";
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
  if (!room) return NextResponse.json({ error: "No room with that code.", code: "not_found" }, { status: 404 });
  if (room.state !== "lobby")
    return NextResponse.json({ error: "That match is already underway.", code: "underway" }, { status: 409 });

  const existing = await playersOf(room.id);
  if (existing.length >= 2)
    return NextResponse.json({ error: "Room is full — two seats only.", code: "full" }, { status: 409 });

  const token = tok();
  await db.insert(roomPlayers).values({
    roomId: room.id,
    token,
    name,
    isHost: false,
    seat: existing.length,
    seenAt: Date.now(),
  });
  await db.update(rooms).set({ updatedAt: Date.now() }).where(eq(rooms.id, room.id));
  return NextResponse.json({ ok: true, code, token });
}

// ── start ───────────────────────────────────────────────────────────────────

async function startMatch(body: Body) {
  const code = str(body, "code").toUpperCase();
  const token = str(body, "token");
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
  if (!room) return NextResponse.json({ error: "room not found", code: "not_found" }, { status: 404 });
  const players = await playersOf(room.id);
  const me = players.find((p) => p.token === token);
  if (!me?.isHost) return NextResponse.json({ error: "only the host can start", code: "not_host" }, { status: 403 });

  let roster = players;
  if (players.length < 2) {
    // seat an automaton so a solo player can still run the ladder
    await db.insert(roomPlayers).values({
      roomId: room.id,
      token: `bot-${code}`,
      name: "AUTOMATON",
      isHost: false,
      isBot: true,
      seat: 1,
      seenAt: Date.now(),
    });
    roster = await playersOf(room.id);
  }

  await db
    .update(rooms)
    .set({ state: "playing", round: 0, roundStartedAt: Date.now(), roundResult: null, updatedAt: Date.now() })
    .where(eq(rooms.id, room.id));

  return NextResponse.json({ ok: true, players: roster.map(pub) });
}

// ── answer ──────────────────────────────────────────────────────────────────

async function answer(body: Body) {
  const code = str(body, "code").toUpperCase();
  const token = str(body, "token");
  const cards = Array.isArray(body.cards) ? (body.cards as unknown[]).map(String) : [];
  const ms = Math.max(0, Math.round(Number(body.ms) || 0));

  const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
  if (!room) return NextResponse.json({ error: "room not found", code: "not_found" }, { status: 404 });
  await db
    .update(roomPlayers)
    .set({
      answer: cards,
      answerRound: room.round,
      answerMs: ms,
      seenAt: Date.now(),
    })
    .where(and(eq(roomPlayers.token, token), eq(roomPlayers.roomId, room.id)));

  await db.update(rooms).set({ updatedAt: Date.now() }).where(eq(rooms.id, room.id));
  return await stateAfter(room.id, code, token);
}

// ── leave ───────────────────────────────────────────────────────────────────

async function leave(body: Body) {
  const token = str(body, "token");
  await db.delete(roomPlayers).where(eq(roomPlayers.token, token));
  return NextResponse.json({ ok: true });
}

// ── state ───────────────────────────────────────────────────────────────────

async function roomState(body: Body) {
  const code = str(body, "code").toUpperCase();
  const token = str(body, "token");
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
  if (!room) return NextResponse.json({ error: "room not found", code: "not_found" }, { status: 404 });
  await db.update(roomPlayers).set({ seenAt: Date.now() }).where(eq(roomPlayers.token, token));
  return await stateAfter(room.id, code, token);
}

function pub(p: RoomPlayer) {
  return {
    token: p.token,
    name: p.name,
    isHost: p.isHost,
    isBot: p.isBot,
    seat: p.seat,
    hp: p.hp,
    score: p.score,
    combo: p.combo,
    bestCombo: p.bestCombo,
    streak: p.streak,
    correct: p.correct,
    answered: p.answered,
    answerRound: p.answerRound,
    answerMs: p.answerMs,
  };
}

async function stateAfter(roomId: number, code: string, token: string) {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) return NextResponse.json({ error: "room not found", code: "not_found" }, { status: 404 });
  let players = await playersOf(roomId);
  const now = Date.now();
  const limit = LIMIT(room.difficulty);
  const q = room.deck[room.round];

  // automaton plays on a deterministic schedule
  if (room.state === "playing" && q) {
    for (const p of players) {
      if (!p.isBot || p.answerRound === room.round) continue;
      const jitter = 0.8 + hash01(code + room.round + p.token) * 0.45;
      const think = [0.68, 0.46, 0.33][room.difficulty - 1] ?? 0.5;
      const due = room.roundStartedAt + Math.round(limit * think * jitter);
      if (now < due) continue;
      const ok = hash01(code + room.round + p.token + "ok") < ([0.7, 0.86, 0.94][room.difficulty - 1] ?? 0.8);
      const hand = dealHand(q);
      await db
        .update(roomPlayers)
        .set({ answer: cpuCards(q, hand, ok), answerRound: room.round, answerMs: Math.round(limit * think * jitter) })
        .where(eq(roomPlayers.id, p.id));
    }
    players = await playersOf(roomId);
  }

  // resolve the round when everyone has spoken or the clock has run out
  if (room.state === "playing" && q) {
    const pending = players.filter((p) => p.answerRound !== room.round);
    const out = pending.length === 0 || now >= room.roundStartedAt + limit;
    if (out) {
      const played = players.map((p) => (p.answerRound === room.round ? p.answer ?? [] : []));
      const ms = players.map((p) => (p.answerRound === room.round ? p.answerMs : limit));
      const correct = players.map((p, i) => isCorrect(q, played[i]));
      const crit = correct.map((c, i) => c && ms[i] < critThreshold(limit));
      const points = correct.map((c, i) => (c ? scoreFor(ms[i], limit, players[i].combo, crit[i]) : 0));
      const damage = [0, 0];
      let winner: number | null = null;
      if (correct[0] || correct[1]) {
        if (correct[0] && correct[1]) winner = ms[0] <= ms[1] ? 0 : 1;
        else winner = correct[0] ? 0 : 1;
        const loser = 1 - winner;
        const dmg = DAMAGE(room.difficulty) + (crit[winner] ? 8 : 0) + Math.min(6, players[winner].streak);
        damage[loser] = dmg;
      } else {
        damage[0] = 6;
        damage[1] = 6;
      }

      const next = players.map(async (p, i) => {
        const won = winner === i;
        const nextCombo = correct[i] ? p.combo + 1 : 0;
        await db
          .update(roomPlayers)
          .set({
            hp: Math.max(0, p.hp - damage[i]),
            score: p.score + points[i],
            combo: nextCombo,
            bestCombo: Math.max(p.bestCombo, nextCombo),
            streak: correct[i] ? p.streak + 1 : 0,
            correct: p.correct + (correct[i] ? 1 : 0),
            answered: p.answered + 1,
          })
          .where(eq(roomPlayers.id, p.id));
        return won;
      });
      await Promise.all(next);

      const result: RoundResult = {
        round: room.round,
        correct,
        ms,
        crit,
        points,
        damage,
        played,
        winner,
        until: now + REVEAL_MS,
      };
      await db
        .update(rooms)
        .set({ state: "reveal", roundResult: result, updatedAt: now })
        .where(eq(rooms.id, roomId));
    }
  }

  // advance out of the reveal
  if (room.state === "reveal" && room.roundResult && now >= room.roundResult.until) {
    players = await playersOf(roomId);
    const dead = players.some((p) => p.hp <= 0);
    const last = room.round + 1 >= room.totalRounds;
    if (dead || last) {
      await db.update(rooms).set({ state: "over", updatedAt: now }).where(eq(rooms.id, roomId));
    } else {
      await db
        .update(rooms)
        .set({ state: "playing", round: room.round + 1, roundResult: null, roundStartedAt: now, updatedAt: now })
        .where(eq(rooms.id, roomId));
    }
  }

  const fresh = await db.select().from(rooms).where(eq(rooms.id, roomId));
  const roster = await playersOf(roomId);
  const me = roster.find((p) => p.token === token) ?? roster[0];
  const r = fresh[0];
  return NextResponse.json({
    ok: true,
    room: {
      code: r.code,
      state: r.state,
      round: r.round,
      totalRounds: r.totalRounds,
      topic: r.topic,
      difficulty: r.difficulty,
      roundStartedAt: r.roundStartedAt,
      roundResult: r.roundResult,
      question: r.deck[r.round] ?? null,
      meToken: me?.token ?? token,
    },
    players: roster.map(pub),
  });
}

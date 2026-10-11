import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";
import type { Question } from "@/game/content";

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  hostName: text("host_name").notNull(),
  topic: text("topic").notNull(),
  difficulty: integer("difficulty").notNull().default(1),
  /** lobby | playing | reveal | over */
  state: text("state").notNull().default("lobby"),
  round: integer("round").notNull().default(0),
  totalRounds: integer("total_rounds").notNull().default(8),
  deck: jsonb("deck").$type<Question[]>().notNull().default([]),
  roundStartedAt: bigint("round_started_at", { mode: "number" }).notNull().default(0),
  roundResult: jsonb("round_result").$type<RoundResult | null>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(0),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(0),
});

export const roomPlayers = pgTable("room_players", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  name: text("name").notNull(),
  isHost: boolean("is_host").notNull().default(false),
  isBot: boolean("is_bot").notNull().default(false),
  seat: integer("seat").notNull().default(0),
  hp: integer("hp").notNull().default(100),
  score: integer("score").notNull().default(0),
  combo: integer("combo").notNull().default(0),
  bestCombo: integer("best_combo").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  correct: integer("correct").notNull().default(0),
  answered: integer("answered").notNull().default(0),
  answer: jsonb("answer").$type<string[] | null>(),
  answerRound: integer("answer_round").notNull().default(-1),
  answerMs: integer("answer_ms").notNull().default(0),
  seenAt: bigint("seen_at", { mode: "number" }).notNull().default(0),
});

export type Room = typeof rooms.$inferSelect;
export type RoomPlayer = typeof roomPlayers.$inferSelect;

export type RoundResult = {
  round: number;
  correct: boolean[];
  ms: number[];
  crit: boolean[];
  points: number[];
  damage: number[];
  played: string[][];
  winner: number | null;
  until: number;
};

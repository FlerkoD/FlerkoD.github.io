import type { LText } from "@/i18n";

export type { LText };

export type CardKind = "clause" | "func" | "pred" | "op" | "dml";

export type ColumnDef = { name: string; type: string; key?: "pk" | "fk" };
export type TableDef = { name: string; rows: number; columns: ColumnDef[] };

export type Glyph = "cart" | "film" | "ball" | "cross" | "rocket" | "book" | "cap" | "bank";

export type TrainingDb = {
  id: string;
  name: string;
  vendor: string;
  tagline: LText;
  brief: LText;
  glyph: Glyph;
  tables: TableDef[];
};

/** Clause-duel challenge — a statement with blanks */
export type Question = {
  id: string;
  db: string;
  tier: 1 | 2 | 3;
  brief: LText;
  /** query text split at the blanks — length === answer.length + 1 */
  parts: string[];
  answer: string[];
  options: string[];
  why: LText;
};

/** Full-statement task — used by the Query Builder and Rapid Query modes */
export type QueryTask = {
  id: string;
  db: string;
  tier: 1 | 2 | 3;
  brief: LText;
  /** canonical solution, pre-split into builder blocks */
  blocks: string[];
  /** wrong blocks mixed into the builder tray */
  decoys: string[];
  /** extra accepted full-text solutions for Rapid Query */
  alts?: string[];
  why: LText;
};

export type GameKind = "duel" | "builder" | "rapid";

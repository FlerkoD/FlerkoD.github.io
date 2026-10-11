import type { CardKind, LText } from "./types";

export const CARD_KIND: Record<string, CardKind> = {
  SELECT: "dml", INSERT: "dml", UPDATE: "dml", DELETE: "dml", CREATE: "dml", DROP: "dml",
  FROM: "clause", WHERE: "clause", "GROUP BY": "clause", "ORDER BY": "clause", HAVING: "clause",
  JOIN: "clause", "LEFT JOIN": "clause", ON: "clause", LIMIT: "clause", DISTINCT: "clause",
  UNION: "clause", AS: "clause",
  COUNT: "func", SUM: "func", AVG: "func", MAX: "func", MIN: "func", ROUND: "func",
  COALESCE: "func", CASE: "func", CAST: "func",
  AND: "pred", OR: "pred", NOT: "pred", IN: "pred", BETWEEN: "pred", LIKE: "pred",
  "IS NULL": "pred", EXISTS: "pred", ANY: "pred",
  ">": "op", "<": "op", "=": "op", "<>": "op",
};

/** guess a card kind for an arbitrary builder block by its leading keyword */
export function kindOfBlock(block: string): CardKind {
  const up = block.trim().toUpperCase();
  const two = up.split(/\s+/).slice(0, 2).join(" ");
  if (CARD_KIND[two]) return CARD_KIND[two];
  const one = up.split(/[\s(]+/)[0];
  if (CARD_KIND[one]) return CARD_KIND[one];
  if (/^(COUNT|SUM|AVG|MAX|MIN)\(/.test(up) || /,\s*(COUNT|SUM|AVG|MAX|MIN)\(/.test(up)) return "func";
  if (/(=|<|>|IS NULL|BETWEEN|LIKE| IN )/.test(up)) return "pred";
  return "op";
}

export const KIND_LABEL: Record<CardKind, LText> = {
  clause: { en: "CLAUSE", ru: "ОПЕРАТОР" },
  func: { en: "AGGREGATE", ru: "АГРЕГАТ" },
  pred: { en: "PREDICATE", ru: "УСЛОВИЕ" },
  op: { en: "OPERAND", ru: "ОПЕРАНД" },
  dml: { en: "STATEMENT", ru: "КОМАНДА" },
};

export const CARD_GLOSS: Record<string, LText> = {
  SELECT: { en: "projects columns out of a relation", ru: "выбирает столбцы из отношения" },
  FROM: { en: "names the relation to read rows from", ru: "указывает, откуда читать строки" },
  WHERE: { en: "filters raw rows before grouping", ru: "фильтрует строки до группировки" },
  "GROUP BY": { en: "collapses rows into aggregate buckets", ru: "сворачивает строки в группы" },
  "ORDER BY": { en: "sorts the result set", ru: "сортирует результат" },
  HAVING: { en: "filters buckets after aggregation", ru: "фильтрует группы после агрегации" },
  JOIN: { en: "combines two relations row by row", ru: "соединяет два отношения" },
  "LEFT JOIN": { en: "keeps every left row, even unmatched", ru: "сохраняет все строки слева" },
  ON: { en: "states the join predicate", ru: "задаёт условие соединения" },
  LIMIT: { en: "caps the number of rows returned", ru: "ограничивает число строк" },
  DISTINCT: { en: "de-duplicates the result rows", ru: "убирает повторы" },
  UNION: { en: "stacks two result sets", ru: "объединяет два результата" },
  AS: { en: "aliases a column or table", ru: "задаёт псевдоним" },
  COUNT: { en: "counts rows in a bucket", ru: "считает строки в группе" },
  SUM: { en: "adds a numeric column", ru: "суммирует числа" },
  AVG: { en: "mean of a numeric column", ru: "среднее значение" },
  MAX: { en: "largest value in a bucket", ru: "наибольшее значение" },
  MIN: { en: "smallest value in a bucket", ru: "наименьшее значение" },
  ROUND: { en: "rounds to a number of decimals", ru: "округляет число" },
  COALESCE: { en: "first non-NULL of its arguments", ru: "первый аргумент не NULL" },
  CASE: { en: "inline conditional expression", ru: "условное выражение" },
  CAST: { en: "converts a value to another type", ru: "приводит к другому типу" },
  AND: { en: "both predicates must hold", ru: "оба условия истинны" },
  OR: { en: "either predicate may hold", ru: "хотя бы одно условие" },
  NOT: { en: "inverts a predicate", ru: "отрицает условие" },
  IN: { en: "value matches a set", ru: "значение входит в набор" },
  BETWEEN: { en: "value inside an inclusive range", ru: "значение в диапазоне" },
  LIKE: { en: "string matches a pattern", ru: "строка по шаблону" },
  "IS NULL": { en: "value is absent", ru: "значение отсутствует" },
  EXISTS: { en: "subquery returns at least one row", ru: "подзапрос вернул строки" },
  ANY: { en: "compares against a set of values", ru: "сравнение с набором" },
  ">": { en: "greater than", ru: "больше" },
  "<": { en: "less than", ru: "меньше" },
  "=": { en: "exactly equal", ru: "равно" },
  "<>": { en: "not equal", ru: "не равно" },
};

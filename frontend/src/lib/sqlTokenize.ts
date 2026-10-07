export type TokType = "keyword" | "string" | "comment" | "number" | "placeholder" | "op" | "ident" | "space";

export interface Tok {
  text: string;
  type: TokType;
  start: number;
}

const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE AND OR NOT INSERT INTO VALUES UPDATE SET DELETE UNION ALL AS ON JOIN LEFT INNER " +
    "ORDER BY LIMIT LIKE IS NULL TRUE FALSE DROP TABLE CREATE GROUP HAVING DISTINCT CASE WHEN THEN ELSE END"
  ).split(" ")
);

/** Tokenizes SQL the way SQLite would read it: '' escapes inside strings, -- line and block comments. */
export function tokenizeSql(sql: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const push = (type: TokType, end: number) => {
    out.push({ type, text: sql.slice(i, end), start: i });
    i = end;
  };

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (/\s/.test(ch)) {
      let j = i;
      while (j < sql.length && /\s/.test(sql[j])) j++;
      push("space", j);
    } else if (ch === "-" && next === "-") {
      const nl = sql.indexOf("\n", i);
      push("comment", nl === -1 ? sql.length : nl);
    } else if (ch === "/" && next === "*") {
      const close = sql.indexOf("*/", i + 2);
      push("comment", close === -1 ? sql.length : close + 2);
    } else if (ch === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") j += 2;
        else if (sql[j] === "'") {
          j++;
          break;
        } else j++;
      }
      push("string", j);
    } else if (ch === "?") {
      push("placeholder", i + 1);
    } else if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < sql.length && /[0-9.]/.test(sql[j])) j++;
      push("number", j);
    } else if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++;
      push(KEYWORDS.has(sql.slice(i, j).toUpperCase()) ? "keyword" : "ident", j);
    } else {
      push("op", i + 1);
    }
  }
  return out;
}

/** Splits tokens so that a [from, to) character range can be styled independently. */
export function splitAtRange(tokens: Tok[], from: number, to: number) {
  const out: (Tok & { injected: boolean })[] = [];
  for (const t of tokens) {
    const end = t.start + t.text.length;
    const cuts = [t.start, Math.max(t.start, Math.min(end, from)), Math.max(t.start, Math.min(end, to)), end];
    for (let k = 0; k < 3; k++) {
      const a = cuts[k];
      const b = cuts[k + 1];
      if (b > a) {
        out.push({ ...t, text: t.text.slice(a - t.start, b - t.start), start: a, injected: a >= from && b <= to && from !== to });
      }
    }
  }
  return out;
}

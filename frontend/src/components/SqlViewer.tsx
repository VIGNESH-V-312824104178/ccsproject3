"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { splitAtRange, tokenizeSql, type TokType } from "@/lib/sqlTokenize";
import { Badge, CopyButton } from "./ui";

const TOKEN_CLASS: Record<TokType, string> = {
  keyword: "text-violet font-semibold",
  string: "text-warn",
  comment: "text-muted/70 italic line-through decoration-danger/70",
  number: "text-neon",
  placeholder: "text-safe font-bold bg-safe/10 rounded px-0.5",
  op: "text-text/70",
  ident: "text-text",
  space: "",
};

export function SqlViewer({
  query,
  injected,
  params,
  mode,
}: {
  query: string;
  injected?: string;
  params?: string[];
  mode: "vulnerable" | "secure";
}) {
  const parts = useMemo(() => {
    const tokens = tokenizeSql(query);
    let from = 0;
    let to = 0;
    if (mode === "vulnerable" && injected) {
      const anchor = "username = '";
      const idx = query.indexOf(anchor);
      if (idx !== -1 && query.startsWith(injected, idx + anchor.length)) {
        from = idx + anchor.length;
        to = from + injected.length;
      }
    }
    return splitAtRange(tokens, from, to);
  }, [query, injected, mode]);

  const hasComment = parts.some((p) => p.type === "comment");

  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-void/80">
      <div className="flex items-center justify-between border-b border-edge bg-abyss/80 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-safe/70" />
          <span className="ml-2 font-mono text-[11px] tracking-widest text-muted uppercase">sqlite&gt; executed query</span>
        </div>
        <div className="flex items-center gap-3">
          {mode === "vulnerable" ? (
            <Badge tone="danger">string concat</Badge>
          ) : (
            <Badge tone="safe">parameterized</Badge>
          )}
          <CopyButton value={query} />
        </div>
      </div>

      <motion.pre
        key={query}
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.012 } } }}
        className="code-block max-h-72 overflow-auto p-4"
      >
        {parts.map((p, i) => (
          <motion.span
            key={i}
            variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0 } }}
            className={`${TOKEN_CLASS[p.type]} ${
              p.injected ? "rounded-sm bg-danger/20 shadow-[inset_0_-2px_0_0_var(--color-danger)]" : ""
            }`}
          >
            {p.text}
          </motion.span>
        ))}
      </motion.pre>

      <AnimatePresence>
        {mode === "secure" && params && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-edge"
          >
            <p className="px-4 pt-3 font-mono text-[10px] tracking-[0.25em] text-safe/80 uppercase">
              Bound parameters → passed as data, never parsed as SQL
            </p>
            <div className="space-y-1.5 p-4 pt-2">
              {params.map((v, i) => (
                <div key={i} className="flex items-start gap-3 font-mono text-xs">
                  <span className="shrink-0 rounded bg-safe/10 px-1.5 py-0.5 font-bold text-safe">?{i + 1}</span>
                  <span className="break-all text-warn">{JSON.stringify(v)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mode === "vulnerable" && (injected || hasComment) && (
        <div className="flex flex-wrap gap-4 border-t border-edge px-4 py-2.5 font-mono text-[10px] tracking-wider text-muted uppercase">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-sm bg-danger/30 shadow-[inset_0_-2px_0_0_var(--color-danger)]" /> user input
          </span>
          {hasComment && (
            <span className="flex items-center gap-1.5">
              <span className="line-through decoration-danger">abc</span> commented out (ignored by DB)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

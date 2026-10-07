"use client";

import { LayoutGroup, motion } from "framer-motion";

export type Mode = "vulnerable" | "secure";

const OPTIONS: { m: Mode; label: string; sub: string }[] = [
  { m: "vulnerable", label: "Vulnerable", sub: "string concatenation" },
  { m: "secure", label: "Secure", sub: "parameterized query" },
];

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <LayoutGroup id="mode-toggle">
      <div role="tablist" aria-label="Endpoint mode" className="grid grid-cols-2 gap-1 rounded-xl border border-edge bg-void/70 p-1">
        {OPTIONS.map((o) => {
          const active = mode === o.m;
          const danger = o.m === "vulnerable";
          const pill = danger ? "border-danger/50 bg-danger/15 shadow-danger" : "border-safe/50 bg-safe/15 shadow-safe";
          const text = danger ? "text-danger" : "text-safe";
          return (
            <button
              key={o.m}
              id={`mode-${o.m}`}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onChange(o.m)}
              className="relative rounded-lg px-4 py-3 text-left"
            >
              {active && (
                <motion.span
                  layoutId="mode-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className={`absolute inset-0 rounded-lg border ${pill}`}
                />
              )}
              <span className="relative flex items-center gap-2">
                <span className={`text-base ${active ? text : "text-muted"}`}>{danger ? "⚠" : "🛡"}</span>
                <span>
                  <span className={`block font-mono text-sm font-bold tracking-widest uppercase ${active ? text : "text-muted"}`}>
                    {o.label}
                  </span>
                  <span className="block font-mono text-[10px] tracking-wider text-muted">{o.sub}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

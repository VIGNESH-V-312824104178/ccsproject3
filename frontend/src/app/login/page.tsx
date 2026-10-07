"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api, ApiError, type LoginResult } from "@/lib/api";
import { sha512Hex } from "@/lib/sha512";
import { PAYLOADS } from "@/lib/payloads";
import { useAuth } from "@/components/AuthProvider";
import { Badge, Button, FieldLabel, Panel, SectionTitle } from "@/components/ui";
import { SqlViewer } from "@/components/SqlViewer";
import { ModeToggle, type Mode } from "@/components/ModeToggle";
import { LoginOutcome } from "@/components/LoginOutcome";

const Q = "\u0027";

/** Mirrors the server-side query construction so the audience can watch it change while typing. */
function previewQuery(mode: Mode, username: string, hash: string) {
  if (mode === "vulnerable") {
    return (
      "SELECT id, username, role, password_hash FROM users WHERE username = " +
      Q + username + Q + " AND password_hash = " + Q + hash + Q
    );
  }
  return "SELECT id, username, role FROM users WHERE username = ? AND password_hash = ?";
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<Mode>("vulnerable");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hash, setHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LoginResult | null>(null);
  const [netError, setNetError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    sha512Hex(password).then((h) => alive && setHash(h));
    return () => {
      alive = false;
    };
  }, [password]);

  const danger = mode === "vulnerable";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setNetError(null);
    try {
      const r = await api<LoginResult>(`/auth/login/${mode}`, { method: "POST", json: { username, password } });
      setResult(r);
      if (r.success && r.token) await signIn(r.token);
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === "object" && "mode" in err.data) {
        setResult(err.data as LoginResult);
      } else {
        setNetError(err instanceof Error ? err.message : "Request failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge tone={danger ? "danger" : "safe"}>module 02 / sql injection</Badge>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
            Login{" "}
            <AnimatePresence mode="wait">
              <motion.span
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={danger ? "text-danger text-glow-danger" : "text-safe text-glow-safe"}
              >
                {danger ? "Attack Lab" : "Hardened"}
              </motion.span>
            </AnimatePresence>
          </h1>
        </div>
        <p className="max-w-md font-mono text-xs text-muted">
          Endpoint: <span className={danger ? "text-danger" : "text-safe"}>POST /api/auth/login/{mode}</span>
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        {/* ------------ left: form ------------ */}
        <div className="space-y-6">
          <Panel hud className={`p-6 transition-shadow duration-500 sm:p-7 ${danger ? "shadow-danger" : "shadow-safe"}`}>
            <ModeToggle
              mode={mode}
              onChange={(m) => {
                setMode(m);
                setResult(null);
              }}
            />

            <form onSubmit={onSubmit} className="mt-6 space-y-5" autoComplete="off">
              <div>
                <FieldLabel htmlFor="login-username">Username</FieldLabel>
                <input
                  id="login-username"
                  className="field"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setResult(null);
                  }}
                  placeholder="analyst"
                  spellCheck={false}
                />
              </div>
              <div>
                <FieldLabel htmlFor="login-password" hint={<span className="text-muted/70">hashed before it reaches SQL</span>}>
                  Password
                </FieldLabel>
                <input
                  id="login-password"
                  type="password"
                  className="field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <AnimatePresence>
                {netError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger"
                  >
                    ✕ {netError}
                  </motion.p>
                )}
              </AnimatePresence>

              <Button id="login-submit" type="submit" variant={danger ? "danger" : "safe"} loading={loading} className="w-full">
                {danger ? "Execute (unsafe) login" : "Execute (safe) login"}
              </Button>
              <p className="text-center font-mono text-xs text-muted">
                Demo account: <span className="text-text">analyst</span> / <span className="text-text">Analyst@2026</span> ·{" "}
                <Link href="/register" className="text-neon hover:underline">
                  register
                </Link>
              </p>
            </form>
          </Panel>

          <Panel className="p-6" transition={{ delay: 0.1 }}>
            <SectionTitle kicker="payload arsenal" title="Click to load into the username field" />
            <div className="mt-4 space-y-2">
              {PAYLOADS.map((p, i) => (
                <motion.button
                  key={p.id}
                  id={`payload-${p.id}`}
                  type="button"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    setUsername(p.value);
                    setPassword("anything");
                    setResult(null);
                  }}
                  className="group block w-full rounded-lg border border-edge bg-void/60 p-3 text-left transition-colors hover:border-danger/40 hover:bg-danger/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-semibold text-text group-hover:text-danger">{p.label}</span>
                    <span className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-danger">↵</span>
                  </div>
                  <code className="mt-1 block truncate font-mono text-[11px] text-warn">{p.value}</code>
                  <p className="mt-1 text-[11px] leading-snug text-muted">{p.desc}</p>
                </motion.button>
              ))}
            </div>
          </Panel>
        </div>

        {/* ------------ right: live SQL + verdict ------------ */}
        <div className="space-y-6">
          <Panel className="p-6" transition={{ delay: 0.05 }}>
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle
                kicker={result ? "executed on server" : "live preview (as you type)"}
                title={danger ? "User input is pasted into the SQL text" : "SQL text is fixed, input travels separately"}
              />
            </div>
            <SqlViewer
              query={result?.query ?? previewQuery(mode, username, hash)}
              injected={username}
              params={mode === "secure" ? result?.params ?? [username, hash] : undefined}
              mode={mode}
            />
          </Panel>

          <AnimatePresence mode="wait">
            {result ? (
              <LoginOutcome key={`${result.mode}-${result.query}`} r={result} />
            ) : (
              <motion.div key="explain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Panel className="p-6">
                  <SectionTitle kicker="how it works" title={danger ? "Why this endpoint is exploitable" : "Why this endpoint is safe"} />
                  {danger ? (
                    <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted marker:text-danger">
                      <li>The server builds the query with <code className="text-warn">&quot;...&quot; + username + &quot;...&quot;</code>.</li>
                      <li>A quote in the input closes the string literal early, so the rest is parsed as SQL.</li>
                      <li><code className="text-warn">OR 1=1</code> makes the WHERE clause true for every row.</li>
                      <li><code className="text-warn">--</code> comments out the password check entirely.</li>
                    </ol>
                  ) : (
                    <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted marker:text-safe">
                      <li>The SQL text is compiled once with <code className="text-safe">?</code> placeholders.</li>
                      <li>User input is bound as typed data, so SQLite never parses it as code.</li>
                      <li>Quotes, comments and UNIONs are just characters in a username nobody has.</li>
                      <li>Errors are generic, so nothing about the schema leaks.</li>
                    </ol>
                  )}
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

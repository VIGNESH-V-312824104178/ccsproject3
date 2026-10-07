"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api, ApiError } from "@/lib/api";
import { sha512Hex } from "@/lib/sha512";
import { Badge, Button, CopyButton, FieldLabel, Panel, SectionTitle } from "@/components/ui";
import { SqlViewer } from "@/components/SqlViewer";

interface RegisterResult {
  success: boolean;
  user: { id: number; username: string };
  passwordHash: string;
  sql: string;
  params: string[];
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ["empty", "weak", "fair", "good", "strong", "excellent"];
  const colors = ["bg-edge", "bg-danger", "bg-warn", "bg-warn", "bg-safe", "bg-safe"];
  return { score: s, label: labels[s], color: colors[s] };
}

/** Renders a hex digest; characters that changed since the previous digest flash (avalanche effect). */
function AvalancheHash({ hash, prev }: { hash: string; prev: string }) {
  const changed = hash && prev ? [...hash].filter((c, i) => c !== prev[i]).length : 0;
  return (
    <div>
      <div className="code-block rounded-lg border border-edge bg-void/80 p-3 text-[12px]">
        {hash ? (
          [...hash].map((c, i) => (
            <span
              key={`${i}-${c}`}
              className={prev && c !== prev[i] ? "animate-[flicker_0.6s_1] text-neon" : "text-text/60"}
            >
              {c}
            </span>
          ))
        ) : (
          <span className="text-muted">type a password to see its SHA-512 digest…</span>
        )}
      </div>
      {hash && prev && (
        <p className="mt-2 font-mono text-[11px] text-muted">
          Avalanche effect: <span className="text-neon">{changed}</span>/128 hex chars changed (
          {Math.round((changed / 128) * 100)}%) from a one-keystroke change.
        </p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [hash, setHash] = useState("");
  const prevHash = useRef("");
  const [prev, setPrev] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterResult | null>(null);

  useEffect(() => {
    let alive = true;
    if (!password) {
      prevHash.current = "";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset derived async state
      setHash("");
      setPrev("");
      return;
    }
    sha512Hex(password).then((h) => {
      if (!alive) return;
      setPrev(prevHash.current);
      prevHash.current = h;
      setHash(h);
    });
    return () => {
      alive = false;
    };
  }, [password]);

  const st = strength(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const r = await api<RegisterResult>("/auth/register", { method: "POST", json: { username, password } });
      setResult(r);
      setPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Panel hud className="p-6 sm:p-8">
        <Badge tone="neon">module 01 / sha-512</Badge>
        <h1 className="mt-4 text-3xl font-black text-white">Register identity</h1>
        <p className="mt-2 text-sm text-muted">
          Your password is hashed with <span className="font-mono text-neon">crypto.createHash(&apos;sha512&apos;)</span> on
          the server before it is stored. The plaintext is discarded immediately.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5" autoComplete="off">
          <div>
            <FieldLabel htmlFor="reg-username" hint={<span className="text-muted/70">3-32 chars, a-z 0-9 _ . -</span>}>
              Username
            </FieldLabel>
            <input
              id="reg-username"
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="neo"
              required
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9_.\-]{3,32}"
            />
          </div>
          <div>
            <FieldLabel
              htmlFor="reg-password"
              hint={
                <button type="button" onClick={() => setShowPw((s) => !s)} className="font-mono text-[10px] tracking-widest text-muted uppercase hover:text-neon">
                  {showPw ? "hide" : "show"}
                </button>
              }
            >
              Password
            </FieldLabel>
            <input
              id="reg-password"
              type={showPw ? "text" : "password"}
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <div className="mt-2 flex items-center gap-3">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.div
                    key={n}
                    className={`h-1 flex-1 rounded-full ${n <= st.score ? st.color : "bg-edge"}`}
                    animate={{ scaleY: n <= st.score ? 1.4 : 1 }}
                  />
                ))}
              </div>
              <span className="w-16 text-right font-mono text-[10px] tracking-widest text-muted uppercase">{st.label}</span>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger"
              >
                ✕ {error}
              </motion.p>
            )}
          </AnimatePresence>

          <Button id="reg-submit" type="submit" loading={loading} className="w-full">
            Hash &amp; store credentials
          </Button>
          <p className="text-center font-mono text-xs text-muted">
            Already registered?{" "}
            <Link href="/login" className="text-neon hover:underline">
              Go to login lab →
            </Link>
          </p>
        </form>
      </Panel>

      <div className="space-y-6">
        <Panel className="p-6" transition={{ delay: 0.1 }}>
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle kicker="live preview (web crypto)" title="SHA-512 digest of your password" />
            {hash && <CopyButton value={hash} />}
          </div>
          <AvalancheHash hash={hash} prev={prev} />
          <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-[11px]">
            {[
              ["output", "512 bits"],
              ["encoding", "128 hex"],
              ["reversible", "no"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-edge bg-void/60 px-3 py-2">
                <p className="tracking-widest text-muted uppercase">{k}</p>
                <p className="mt-0.5 text-text">{v}</p>
              </div>
            ))}
          </div>
        </Panel>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div key="ok" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Panel className="space-y-4 border-safe/40 p-6 shadow-safe">
                <div className="flex items-center justify-between">
                  <SectionTitle kicker="server response / 201 created" title={<span className="text-safe text-glow-safe">Identity stored securely</span>} />
                  <Badge tone="safe">user #{result.user.id}</Badge>
                </div>
                <SqlViewer query={result.sql} params={result.params} mode="secure" />
                <div>
                  <p className="mb-1.5 font-mono text-[10px] tracking-[0.25em] text-muted uppercase">users.password_hash (on disk)</p>
                  <p className="code-block rounded-lg border border-edge bg-void/80 p-3 text-safe">{result.passwordHash}</p>
                </div>
                <Link href="/login" id="reg-goto-login" className="inline-block font-mono text-xs font-bold tracking-widest text-neon uppercase hover:underline">
                  Proceed to login lab →
                </Link>
              </Panel>
            </motion.div>
          ) : (
            <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Panel className="p-6">
                <SectionTitle kicker="threat model" title="Why hash instead of encrypt?" />
                <ul className="mt-4 space-y-3 text-sm text-muted">
                  <li className="flex gap-3">
                    <span className="text-neon">▹</span> Hashing is one-way: even with full DB access, an attacker cannot
                    decrypt a password, only guess and compare.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-neon">▹</span> Login works by hashing the submitted password and comparing digests.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-warn">▹</span> Caveat: plain SHA-512 is fast. Production systems add a unique salt
                    and use a slow KDF (Argon2id, bcrypt, scrypt) to resist brute force and rainbow tables.
                  </li>
                </ul>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

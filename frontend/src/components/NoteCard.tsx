"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { api, ApiError, type DecryptedNote, type RawNote } from "@/lib/api";
import { Badge, CopyButton, ScrambleText } from "./ui";

type Busy = null | "decrypt" | "tamper" | "delete";

function Field({ label, value, tone = "text-text/70" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.25em] text-muted uppercase">{label}</span>
        <CopyButton value={value} />
      </div>
      <p className={`code-block rounded-md border border-edge bg-void/80 px-3 py-2 text-[11px] ${tone}`}>{value}</p>
    </div>
  );
}

export function NoteCard({
  note,
  index,
  onChanged,
  onDeleted,
}: {
  note: RawNote;
  index: number;
  onChanged: (n: RawNote) => void;
  onDeleted: (id: number) => void;
}) {
  const [plain, setPlain] = useState<DecryptedNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [tampered, setTampered] = useState(false);

  async function decrypt() {
    setBusy("decrypt");
    setError(null);
    try {
      setPlain(await api<DecryptedNote>(`/notes/${note.id}/decrypt`));
    } catch (e) {
      setPlain(null);
      setError(e instanceof ApiError ? e.message : "Decryption failed");
    } finally {
      setBusy(null);
    }
  }

  async function tamper() {
    setBusy("tamper");
    try {
      const r = await api<{ note: RawNote; flippedByte: number }>(`/notes/${note.id}/tamper`, { method: "POST" });
      onChanged(r.note);
      setTampered(true);
      setPlain(null);
      setError(null);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      await api(`/notes/${note.id}`, { method: "DELETE" });
      onDeleted(note.id);
    } finally {
      setBusy(null);
    }
  }

  const state = error ? "failed" : plain ? "open" : "locked";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.05 }}
      className={`panel overflow-hidden border transition-colors duration-500 ${
        state === "open" ? "border-safe/40" : state === "failed" ? "border-danger/50" : "border-edge"
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge bg-abyss/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-neon">#{String(note.id).padStart(3, "0")}</span>
          <AnimatePresence mode="wait">
            <motion.span key={state} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {state === "open" && <Badge tone="safe">🔓 decrypted · hmac ok</Badge>}
              {state === "locked" && <Badge tone="muted">🔒 encrypted at rest</Badge>}
              {state === "failed" && <Badge tone="danger">⚠ integrity failure</Badge>}
            </motion.span>
          </AnimatePresence>
          {tampered && <Badge tone="warn">tampered</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] text-muted sm:inline">{note.createdAt} UTC</span>
          {plain ? (
            <ActionBtn id={`note-${note.id}-lock`} onClick={() => setPlain(null)} tone="neon">
              Lock
            </ActionBtn>
          ) : (
            <ActionBtn id={`note-${note.id}-decrypt`} onClick={decrypt} tone="safe" busy={busy === "decrypt"}>
              Decrypt
            </ActionBtn>
          )}
          <ActionBtn id={`note-${note.id}-tamper`} onClick={tamper} tone="warn" busy={busy === "tamper"} title="Flip one bit of the stored ciphertext">
            Tamper
          </ActionBtn>
          <ActionBtn id={`note-${note.id}-delete`} onClick={remove} tone="danger" busy={busy === "delete"}>
            ✕
          </ActionBtn>
        </div>
      </header>

      <div className="grid gap-0 md:grid-cols-2">
        <div className="space-y-3 p-5 md:border-r md:border-edge">
          <p className="font-mono text-[10px] tracking-[0.3em] text-danger/80 uppercase">▼ stored in sqlite (what an attacker sees)</p>
          <Field label="ciphertext · base64" value={note.ciphertext} tone="text-violet" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="iv · 128-bit" value={note.iv} tone="text-neon/80" />
            <Field label="hmac-sha512 · first 32" value={`${note.mac.slice(0, 32)}…`} tone="text-warn/80" />
          </div>
        </div>

        <div className="relative min-h-48 p-5">
          <p className="font-mono text-[10px] tracking-[0.3em] text-safe/80 uppercase">▼ decrypted for authorized owner</p>
          <AnimatePresence mode="wait">
            {plain ? (
              <motion.div key="plain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 space-y-3">
                <h3 className="text-lg font-bold text-white">
                  <ScrambleText text={plain.title} duration={500} />
                </h3>
                <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-safe">
                  <ScrambleText text={plain.content} duration={900} />
                </p>
                <p className="font-mono text-[10px] text-muted">
                  key fingerprint <span className="text-neon">{plain.keyFingerprint}</span> · AES-256-CBC · PKCS#7
                </p>
              </motion.div>
            ) : error ? (
              <motion.div
                key="err"
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: [0, -8, 8, -5, 5, 0] }}
                exit={{ opacity: 0 }}
                className="mt-3 rounded-lg border border-danger/40 bg-danger/10 p-4"
              >
                <p className="font-mono text-xs font-bold text-danger">DECRYPTION REFUSED</p>
                <p className="mt-1 font-mono text-[11px] text-danger/80">{error}</p>
                <p className="mt-2 text-[11px] text-muted">
                  Encrypt-then-MAC detected the modification before any padding/decryption was attempted.
                </p>
              </motion.div>
            ) : (
              <motion.button
                key="locked"
                type="button"
                onClick={decrypt}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                whileHover={{ scale: 1.02 }}
                className="mt-3 flex h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-edge text-muted transition-colors hover:border-safe/40 hover:text-safe"
              >
                <motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-3xl">
                  🔒
                </motion.span>
                <span className="font-mono text-[11px] tracking-widest uppercase">click to decrypt</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}

function ActionBtn({
  id,
  onClick,
  tone,
  busy,
  title,
  children,
}: {
  id: string;
  onClick: () => void;
  tone: "safe" | "neon" | "warn" | "danger";
  busy?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    safe: "hover:border-safe/50 hover:text-safe",
    neon: "hover:border-neon/50 hover:text-neon",
    warn: "hover:border-warn/50 hover:text-warn",
    danger: "hover:border-danger/50 hover:text-danger",
  };
  return (
    <motion.button
      id={id}
      type="button"
      title={title}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      disabled={busy}
      className={`rounded-md border border-edge px-2.5 py-1 font-mono text-[10px] font-semibold tracking-widest text-muted uppercase transition-colors disabled:opacity-50 ${tones[tone]}`}
    >
      {busy ? "…" : children}
    </motion.button>
  );
}

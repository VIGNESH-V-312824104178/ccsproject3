"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { api, ApiError, type RawNote, type EncryptMeta } from "@/lib/api";
import { Badge, Button, FieldLabel, Panel, SectionTitle } from "@/components/ui";
import { NoteCard } from "@/components/NoteCard";
import { DbInspector } from "@/components/DbInspector";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [notes, setNotes] = useState<RawNote[]>([]);
  const [fetching, setFetching] = useState(true);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api<{ notes: RawNote[] }>("/notes")
      .then((r) => alive && setNotes(r.notes))
      .catch(() => {})
      .finally(() => alive && setFetching(false));
    return () => {
      alive = false;
    };
  }, [user]);

  if (loading || !user) {
    return <div className="p-8 text-center font-mono text-sm text-muted">loading...</div>;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api<{ note: RawNote; meta: EncryptMeta }>("/notes", {
        method: "POST",
        json: { title, content },
      });
      setNotes([res.note, ...notes]);
      setTitle("");
      setContent("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to encrypt note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Badge tone="safe">module 03 / confidentiality at rest</Badge>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">AES-256-CBC Vault</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Your notes are encrypted in the browser using the Web Crypto API, right? 
          No! We do it on the server using Node's <span className="font-mono text-neon">crypto</span> module 
          to demonstrate backend at-rest encryption before insertion into SQLite.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Left column: Authorized User View */}
        <div className="space-y-6">
          <Panel hud className="p-6">
            <SectionTitle kicker="authorized session" title={`Welcome, ${user.username}`} />
            
            <form onSubmit={onSave} className="mt-6 space-y-4">
              <div>
                <FieldLabel htmlFor="note-title">Title</FieldLabel>
                <input
                  id="note-title"
                  className="field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Secret designation..."
                  required
                  maxLength={120}
                />
              </div>
              <div>
                <FieldLabel htmlFor="note-content">Classified Content</FieldLabel>
                <textarea
                  id="note-content"
                  className="field min-h-[120px] resize-y"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter classified data here..."
                  required
                  maxLength={10000}
                />
              </div>

              <AnimatePresence>
                {saveError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger"
                  >
                    ✕ {saveError}
                  </motion.p>
                )}
              </AnimatePresence>

              <Button type="submit" variant="safe" loading={saving} className="w-full">
                Encrypt &amp; Store
              </Button>
            </form>
          </Panel>

          <div className="space-y-4">
            <SectionTitle kicker="your decrypted notes" title="Data retrieved & verified" className="px-1" />
            {fetching ? (
              <p className="px-1 font-mono text-xs text-muted">loading notes...</p>
            ) : notes.length === 0 ? (
              <Panel className="border-dashed border-edge p-8 text-center">
                <p className="font-mono text-sm text-muted">No encrypted notes found.</p>
              </Panel>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {notes.map((note, idx) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      index={idx}
                      onChanged={(n) => {
                        setNotes((prev) => prev.map((old) => (old.id === n.id ? n : old)));
                        setRefreshKey((k) => k + 1);
                      }}
                      onDeleted={(id) => {
                        setNotes((prev) => prev.filter((n) => n.id !== id));
                        setRefreshKey((k) => k + 1);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Attacker View */}
        <div className="space-y-6">
          <Panel className="border-danger/40 shadow-danger/20 overflow-hidden">
            <div className="bg-danger/10 p-4 border-b border-danger/20">
              <SectionTitle kicker="threat model" title={<span className="text-danger text-glow-danger">Attacker View (Stolen DB)</span>} />
              <p className="mt-2 text-[11px] text-danger/80 font-mono leading-relaxed">
                If an attacker gains read access to <code className="text-danger">vault.db</code> via SQL injection or a server breach, this is exactly what they see. Notice how neither passwords nor note contents are readable.
              </p>
            </div>
            <DbInspector refreshKey={refreshKey} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

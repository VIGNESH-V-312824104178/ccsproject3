"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { api, type RawNote } from "@/lib/api";
import { SectionTitle } from "./ui";

interface InspectorData {
  users: { id: number; username: string; password_hash: string; role: string; created_at: string }[];
  notes: RawNote[];
}

/** Simulates an attacker who stole a copy of vault.db: everything they would see, verbatim. */
export function DbInspector({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<InspectorData | null>(null);

  useEffect(() => {
    api<InspectorData>("/notes/inspector").then(setData).catch(() => setData(null));
  }, [refreshKey]);

  if (!data) return <p className="p-6 font-mono text-xs text-muted">loading vault.db…</p>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <SectionTitle kicker="SELECT * FROM users" title="Passwords exist only as SHA-512 digests" />
        <div className="mt-3 overflow-auto rounded-lg border border-edge">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="bg-abyss text-muted">
              <tr>
                {["id", "username", "role", "password_hash"].map((h) => (
                  <th key={h} className="px-3 py-2 tracking-widest uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.users.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-t border-edge/60"
                >
                  <td className="px-3 py-2 text-neon">{u.id}</td>
                  <td className="px-3 py-2 text-text">{u.username}</td>
                  <td className="px-3 py-2 text-muted">{u.role}</td>
                  <td className="max-w-[28rem] truncate px-3 py-2 text-safe/80" title={u.password_hash}>
                    {u.password_hash}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <SectionTitle kicker="SELECT * FROM notes" title="Every user's notes: unreadable without the key" />
        <div className="mt-3 overflow-auto rounded-lg border border-edge">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="bg-abyss text-muted">
              <tr>
                {["id", "user_id", "iv", "ciphertext"].map((h) => (
                  <th key={h} className="px-3 py-2 tracking-widest uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.notes.map((n, i) => (
                <motion.tr
                  key={n.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-t border-edge/60"
                >
                  <td className="px-3 py-2 text-neon">{n.id}</td>
                  <td className="px-3 py-2 text-muted">{n.userId}</td>
                  <td className="px-3 py-2 text-text/60">{n.iv.slice(0, 12)}…</td>
                  <td className="max-w-[30rem] truncate px-3 py-2 text-violet" title={n.ciphertext}>
                    {n.ciphertext}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

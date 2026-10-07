/**
 * Encrypted notes (AES-256-CBC + HMAC-SHA-512).
 *
 *   GET    /api/notes               - list caller's notes as RAW ciphertext (exactly what's on disk)
 *   POST   /api/notes               - encrypt + store
 *   GET    /api/notes/:id/decrypt   - verify HMAC, decrypt - owner only
 *   POST   /api/notes/:id/tamper    - flip one ciphertext byte to demo integrity protection
 *   DELETE /api/notes/:id
 *   GET    /api/notes/inspector     - "attacker with a copy of vault.db" view
 */
const express = require('express');
const { db } = require('../db');
const { encryptNote, decryptNote } = require('../crypto');
const { requireAuth } = require('../session');

const router = express.Router();
router.use(requireAuth);

const MAX_TITLE = 120;
const MAX_CONTENT = 10_000;

function toRaw(row) {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    iv: row.iv,
    ciphertext: row.ciphertext,
    mac: row.mac,
    createdAt: row.created_at,
  };
}

function parseId(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid note id' });
    return null;
  }
  return id;
}

/** Ownership check is baked into the query: other users' notes are simply not found. */
function getOwnedNote(id, userId) {
  return db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, userId);
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json({ notes: rows.map(toRaw) });
});

router.get('/inspector', (req, res) => {
  const users = db.prepare('SELECT id, username, password_hash, role, created_at FROM users ORDER BY id').all();
  const notes = db.prepare('SELECT * FROM notes ORDER BY id').all();
  res.json({
    users: users.map((u) => ({ ...u, id: Number(u.id) })),
    notes: notes.map(toRaw),
  });
});

router.post('/', (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  const content = String(req.body?.content ?? '');
  if (!title || title.length > MAX_TITLE) return res.status(400).json({ error: `Title is required (max ${MAX_TITLE} chars)` });
  if (!content || content.length > MAX_CONTENT) return res.status(400).json({ error: `Content is required (max ${MAX_CONTENT} chars)` });

  const enc = encryptNote(req.user.id, JSON.stringify({ title, content }));
  const info = db
    .prepare('INSERT INTO notes (user_id, iv, ciphertext, mac) VALUES (?, ?, ?, ?)')
    .run(req.user.id, enc.iv, enc.ciphertext, enc.mac);
  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ note: toRaw(row), meta: enc.meta });
});

router.get('/:id/decrypt', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const row = getOwnedNote(id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Note not found' });

  try {
    const { plaintext, keyFingerprint } = decryptNote(req.user.id, row);
    const { title, content } = JSON.parse(plaintext);
    res.json({ id, title, content, keyFingerprint, integrity: 'verified' });
  } catch (err) {
    res.status(422).json({ id, error: err.message, integrity: 'failed' });
  }
});

router.post('/:id/tamper', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const row = getOwnedNote(id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Note not found' });

  const buf = Buffer.from(row.ciphertext, 'base64');
  const pos = Math.floor(Math.random() * buf.length);
  buf[pos] ^= 0x01; // flip a single bit
  const tampered = buf.toString('base64');
  db.prepare('UPDATE notes SET ciphertext = ? WHERE id = ?').run(tampered, id);
  res.json({ note: toRaw({ ...row, ciphertext: tampered }), flippedByte: pos });
});

router.delete('/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const info = db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Note not found' });
  res.json({ success: true });
});

module.exports = router;

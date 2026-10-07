/**
 * SQLite persistence (local file: backend/data/vault.db).
 * Uses Node's built-in `node:sqlite` module – no native compilation, fully offline.
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { sha512, encryptNote } = require('./crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'vault.db');

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_FILE);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,           -- SHA-512 hex digest, never plaintext
    role          TEXT    NOT NULL DEFAULT 'user',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    iv          TEXT    NOT NULL,             -- 16-byte IV (hex), random per note
    ciphertext  TEXT    NOT NULL,             -- AES-256-CBC output (base64)
    mac         TEXT    NOT NULL,             -- HMAC-SHA-512(iv:ciphertext) (hex)
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT    PRIMARY KEY,          -- SHA-512 of bearer token
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  INTEGER NOT NULL
  );
`);

/** Seed a privileged "admin" account (random password) so the SQLi bypass has a juicy target. */
function seed() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;

  const adminPassword = crypto.randomBytes(18).toString('base64url');
  const insertUser = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
  const admin = insertUser.run('admin', sha512(adminPassword), 'admin');
  insertUser.run('analyst', sha512('Analyst@2026'), 'user');

  const insertNote = db.prepare('INSERT INTO notes (user_id, iv, ciphertext, mac) VALUES (?, ?, ?, ?)');
  const adminId = Number(admin.lastInsertRowid);
  const secrets = [
    ['Root credentials', 'Prod DB root password: Tr0ub4dor&3-horse-battery-staple'],
    ['Incident #4471', 'Lateral movement detected from 10.0.4.17. Rotate all service-account keys before Friday.'],
    ['Backup encryption passphrase', 'Offsite tape vault passphrase: "correct horse battery staple 1987"'],
  ];
  for (const [title, content] of secrets) {
    // Title AND body are encrypted together – no plaintext metadata at rest.
    const enc = encryptNote(adminId, JSON.stringify({ title, content }));
    insertNote.run(adminId, enc.iv, enc.ciphertext, enc.mac);
  }

  console.log('[db] Seeded users: admin (random password – try SQL injection!) and analyst / Analyst@2026');
}

seed();

module.exports = { db, DB_FILE };

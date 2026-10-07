/**
 * Authentication routes.
 *
 *   POST /api/auth/register          - SHA-512 hash + parameterized INSERT
 *   POST /api/auth/login/vulnerable  - WARNING: raw string concatenation (SQL injectable, ON PURPOSE)
 *   POST /api/auth/login/secure      - parameterized query (injection-proof)
 *   GET  /api/auth/me                - current session
 *   POST /api/auth/logout
 */
const express = require('express');
const { db } = require('../db');
const { sha512 } = require('../crypto');
const { createSession, destroySession, extractToken, requireAuth } = require('../session');

const router = express.Router();

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;

/** Tiny heuristic scanner so the UI can annotate *why* a payload is dangerous. */
function detectInjection(input) {
  const s = String(input || '');
  const rules = [
    [/'/, 'Single quote breaks out of the string literal'],
    [/--|#|\/\*/, 'SQL comment truncates the rest of the query'],
    [/\bOR\b\s+[^=]+=/i, 'Tautology (e.g. OR 1=1) makes WHERE always true'],
    [/\bUNION\b/i, 'UNION SELECT appends attacker-controlled rows'],
    [/;/, 'Statement terminator (stacked query attempt)'],
    [/sqlite_master|sqlite_schema/i, 'Schema enumeration via sqlite_master'],
  ];
  return rules.filter(([re]) => re.test(s)).map(([, msg]) => msg);
}

function publicUser(u) {
  return { id: Number(u.id), username: u.username, role: u.role };
}

/* ------------------------------------------------------------------ */
/*  Registration                                                       */
/* ------------------------------------------------------------------ */
router.post('/register', (req, res) => {
  const username = String(req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-32 chars: letters, digits, _ . -' });
  }
  if (password.length < 8 || password.length > 256) {
    return res.status(400).json({ error: 'Password must be 8-256 characters' });
  }

  const passwordHash = sha512(password); // plaintext is discarded after this line
  const sql = 'INSERT INTO users (username, password_hash) VALUES (?, ?)';
  try {
    const info = db.prepare(sql).run(username, passwordHash);
    return res.status(201).json({
      success: true,
      user: { id: Number(info.lastInsertRowid), username, role: 'user' },
      passwordHash,
      sql,
      params: [username, passwordHash],
    });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

/* ------------------------------------------------------------------ */
/*  VULNERABLE login - DO NOT USE IN REAL CODE                         */
/* ------------------------------------------------------------------ */
router.post('/login/vulnerable', (req, res) => {
  const username = String(req.body?.username ?? '');
  const password = String(req.body?.password ?? '');
  const passwordHash = sha512(password);

  // VULNERABILITY: user input is concatenated directly into the SQL text.
  // Payload `' OR 1=1 --` turns the WHERE clause into a tautology and comments out the password check.
  const query =
    "SELECT id, username, role, password_hash FROM users WHERE username = '" +
    username +
    "' AND password_hash = '" +
    passwordHash +
    "'";

  const base = { mode: 'vulnerable', query, detected: detectInjection(username) };

  let rows;
  try {
    rows = db.prepare(query).all();
  } catch (err) {
    // Second vulnerability: verbose DB errors leak query structure to the attacker.
    return res.status(500).json({ ...base, success: false, error: `SQLite error: ${err.message}`, rows: [] });
  }

  // Leaks every row the injected query returned (great for UNION-based dumps in the demo).
  const leaked = rows.map((r) => ({ ...r }));

  if (rows.length === 0) {
    return res.status(401).json({ ...base, success: false, error: 'Invalid credentials', rows: leaked });
  }

  // Logs in as whichever row came back first - typically the admin (id = 1).
  const first = rows[0];
  const realUser = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(first.id);
  if (!realUser) {
    return res.status(200).json({
      ...base,
      success: false,
      error: 'Query returned rows, but none map to a real account (data still leaked below)',
      rows: leaked,
    });
  }

  const token = createSession(realUser.id);
  return res.json({
    ...base,
    success: true,
    bypassed: base.detected.length > 0,
    token,
    user: publicUser(realUser),
    rows: leaked,
  });
});

/* ------------------------------------------------------------------ */
/*  SECURE login - parameterized query                                 */
/* ------------------------------------------------------------------ */
router.post('/login/secure', (req, res) => {
  const username = String(req.body?.username ?? '');
  const password = String(req.body?.password ?? '');
  const passwordHash = sha512(password);

  // Placeholders are bound by the SQLite engine as *data*, never parsed as SQL.
  const query = 'SELECT id, username, role FROM users WHERE username = ? AND password_hash = ?';
  const params = [username, passwordHash];
  const base = { mode: 'secure', query, params, detected: detectInjection(username) };

  let row;
  try {
    row = db.prepare(query).get(...params);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ...base, success: false, error: 'Internal error' }); // generic error, no leak
  }

  if (!row) {
    return res.status(401).json({
      ...base,
      success: false,
      error: 'Invalid credentials',
      blocked: base.detected.length > 0,
    });
  }

  const token = createSession(row.id);
  return res.json({ ...base, success: true, token, user: publicUser(row) });
});

/* ------------------------------------------------------------------ */
/*  Session helpers                                                    */
/* ------------------------------------------------------------------ */
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: { id: req.user.id, username: req.user.username, role: req.user.role, createdAt: req.user.createdAt },
    passwordHash: req.user.passwordHash,
  });
});

router.post('/logout', (req, res) => {
  destroySession(extractToken(req));
  res.json({ success: true });
});

module.exports = router;

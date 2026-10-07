/**
 * Session management + auth middleware.
 * Bearer tokens are random 256-bit values; only their SHA-512 digest is stored.
 */
const { db } = require('./db');
const { sha512, newToken } = require('./crypto');

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function createSession(userId) {
  const token = newToken();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    sha512(token),
    userId,
    Date.now() + SESSION_TTL_MS
  );
  return token;
}

function destroySession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha512(token));
}

function extractToken(req) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && /^[a-f0-9]{64}$/.test(token || '') ? token : null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Missing or malformed bearer token' });

  const row = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.password_hash, u.created_at, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?`
    )
    .get(sha512(token));

  if (!row || row.expires_at < Date.now()) {
    destroySession(token);
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  req.user = { id: row.id, username: row.username, role: row.role, passwordHash: row.password_hash, createdAt: row.created_at };
  req.token = token;
  next();
}

module.exports = { createSession, destroySession, extractToken, requireAuth };

/**
 * Secure Data Vault - Express API server (offline, localhost only).
 */
const express = require('express');
const cors = require('cors');
const { DB_FILE } = require('./db');
const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '127.0.0.1';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

const app = express();
app.disable('x-powered-by');

// Basic hardening headers (no external deps required)
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  });
  next();
});

app.use(cors({ origin: [FRONTEND_ORIGIN, 'http://127.0.0.1:3000'], credentials: false }));
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: 'sqlite (local file)', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, HOST, () => {
  console.log(`\n  🔐 Secure Data Vault API  →  http://${HOST}:${PORT}`);
  console.log(`  📁 SQLite database       →  ${DB_FILE}\n`);
});

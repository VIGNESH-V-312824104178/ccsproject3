/** Deletes the local SQLite database so it is re-created and re-seeded on next start. */
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'data');
for (const f of ['vault.db', 'vault.db-wal', 'vault.db-shm']) {
  const p = path.join(dir, f);
  if (fs.existsSync(p)) {
    fs.rmSync(p);
    console.log(`removed ${p}`);
  }
}
console.log('Database reset. It will be re-seeded on next server start.');

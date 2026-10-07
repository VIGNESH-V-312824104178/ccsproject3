/**
 * Cryptographic primitives for the Secure Data Vault.
 *
 *  - SHA-512 password hashing (integrity / one-way storage)
 *  - AES-256-CBC symmetric encryption for notes (confidentiality at rest)
 *  - HMAC-SHA-512 over IV || ciphertext (encrypt-then-MAC, tamper detection)
 *
 * Everything uses Node's built-in `crypto` module – no external services.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const KEY_FILE = path.join(__dirname, '..', 'data', 'master.key');
const AES_ALGO = 'aes-256-cbc';
const IV_BYTES = 16; // AES block size

/* ------------------------------------------------------------------ */
/*  SHA-512                                                            */
/* ------------------------------------------------------------------ */

/**
 * One-way SHA-512 digest of a password (hex, 128 chars).
 * NOTE: intentionally unsalted so the classic SQL-injection demo query
 * (`... AND password_hash = '<hash>'`) can be built in a single statement.
 * Production systems should use a salted, slow KDF (Argon2id / bcrypt / scrypt).
 */
function sha512(input) {
  return crypto.createHash('sha512').update(String(input), 'utf8').digest('hex');
}

/** Constant-time comparison of two hex strings. */
function safeEqualHex(a, b) {
  const ba = Buffer.from(String(a), 'hex');
  const bb = Buffer.from(String(b), 'hex');
  if (ba.length !== bb.length || ba.length === 0) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/* ------------------------------------------------------------------ */
/*  Master key management (local file, generated on first run)         */
/* ------------------------------------------------------------------ */

function loadMasterKey() {
  if (process.env.VAULT_MASTER_KEY) {
    const k = Buffer.from(process.env.VAULT_MASTER_KEY, 'hex');
    if (k.length !== 32) throw new Error('VAULT_MASTER_KEY must be 64 hex chars (32 bytes)');
    return k;
  }
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
  if (!fs.existsSync(KEY_FILE)) {
    fs.writeFileSync(KEY_FILE, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
    console.log('[crypto] Generated new 256-bit master key at data/master.key');
  }
  return Buffer.from(fs.readFileSync(KEY_FILE, 'utf8').trim(), 'hex');
}

const MASTER_KEY = loadMasterKey();

/**
 * Derive per-user encryption + MAC keys with HKDF-SHA-512 so each user's
 * notes are encrypted under a different key.
 */
function deriveUserKeys(userId) {
  const okm = Buffer.from(
    crypto.hkdfSync('sha512', MASTER_KEY, Buffer.from('secure-data-vault'), Buffer.from(`user:${userId}`), 64)
  );
  return { encKey: okm.subarray(0, 32), macKey: okm.subarray(32, 64) };
}

/** Short fingerprint of a key – safe to display, reveals nothing useful. */
function keyFingerprint(key) {
  return sha512(key.toString('hex')).slice(0, 16);
}

/* ------------------------------------------------------------------ */
/*  AES-256-CBC + HMAC-SHA-512                                         */
/* ------------------------------------------------------------------ */

function computeMac(macKey, ivHex, ciphertextB64) {
  return crypto.createHmac('sha512', macKey).update(`${ivHex}:${ciphertextB64}`).digest('hex');
}

/**
 * Encrypt UTF-8 plaintext. Returns hex IV, base64 ciphertext and hex HMAC tag.
 */
function encryptNote(userId, plaintext) {
  const { encKey, macKey } = deriveUserKeys(userId);
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(AES_ALGO, encKey, iv); // PKCS#7 padding by default
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const ivHex = iv.toString('hex');
  const ciphertextB64 = ciphertext.toString('base64');
  return {
    iv: ivHex,
    ciphertext: ciphertextB64,
    mac: computeMac(macKey, ivHex, ciphertextB64),
    meta: {
      algorithm: 'AES-256-CBC',
      padding: 'PKCS#7',
      integrity: 'HMAC-SHA-512 (encrypt-then-MAC)',
      kdf: 'HKDF-SHA-512 (per-user key)',
      keyFingerprint: keyFingerprint(encKey),
      plaintextBytes: Buffer.byteLength(String(plaintext), 'utf8'),
      ciphertextBytes: ciphertext.length,
      blocks: ciphertext.length / IV_BYTES,
    },
  };
}

/**
 * Verify HMAC then decrypt. Throws if the record was tampered with or the key is wrong.
 */
function decryptNote(userId, { iv, ciphertext, mac }) {
  const { encKey, macKey } = deriveUserKeys(userId);
  const expected = computeMac(macKey, iv, ciphertext);
  if (!safeEqualHex(expected, mac)) {
    throw new Error('Integrity check failed: HMAC mismatch (ciphertext tampered or wrong key)');
  }
  const decipher = crypto.createDecipheriv(AES_ALGO, encKey, Buffer.from(iv, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]);
  return { plaintext: plaintext.toString('utf8'), keyFingerprint: keyFingerprint(encKey) };
}

/* ------------------------------------------------------------------ */
/*  Session tokens                                                     */
/* ------------------------------------------------------------------ */

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  sha512,
  safeEqualHex,
  encryptNote,
  decryptNote,
  newToken,
};

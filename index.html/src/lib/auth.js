'use strict';
/**
 * Admin authentication.
 * - Passwords hashed with scrypt (random salt) — never stored in plain text.
 * - Sessions are HMAC-signed, HttpOnly, SameSite=Strict cookies.
 * - Every admin form carries a CSRF token tied to the session.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { db, DATA_DIR } = require('./db');
const { parseCookies } = require('./http');

const COOKIE = 'sb_admin';
const SESSION_HOURS = 12;

function loadSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') {
    console.warn('[security] SESSION_SECRET is missing or shorter than 32 characters — using a generated secret stored in the data folder.');
  }
  const file = path.join(DATA_DIR, '.session-secret');
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(file, 'utf8').trim();
}
const SECRET = loadSecret();

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

const sign = (value) => crypto.createHmac('sha256', SECRET).update(value).digest('base64url');

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function createSessionCookie(adminId) {
  const payload = Buffer.from(
    JSON.stringify({ uid: adminId, exp: Date.now() + SESSION_HOURS * 3600 * 1000, n: crypto.randomBytes(8).toString('hex') }),
  ).toString('base64url');
  const value = `${payload}.${sign(payload)}`;
  return cookieHeader(value, SESSION_HOURS * 3600);
}

function cookieHeader(value, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1' ? '; Secure' : '';
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}

const clearSessionCookie = () => cookieHeader('', 0);

/** Returns { admin, raw } when the request has a valid admin session, else null. */
function getSession(req) {
  const raw = parseCookies(req)[COOKIE];
  if (!raw) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig || !safeEqual(sign(payload), sig)) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!data.exp || data.exp < Date.now()) return null;
  const admin = db.prepare('SELECT id, email, name FROM admin_users WHERE id = ?').get(data.uid);
  if (!admin) return null;
  return { admin, raw };
}

const csrfToken = (session) => sign('csrf:' + session.raw);
const checkCsrf = (session, token) => !!token && safeEqual(csrfToken(session), token);

function authenticate(email, password) {
  const user = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(String(email || '').trim());
  // Always run a hash so response timing doesn't reveal whether the email exists.
  const ok = user ? verifyPassword(password, user.password_hash) : (verifyPassword(password, hashPassword('x')), false);
  if (!ok) return null;
  db.prepare("UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
  return user;
}

function createAdmin(email, password, name = 'Admin') {
  const existing = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(email);
  if (existing) {
    db.prepare('UPDATE admin_users SET password_hash = ?, name = ? WHERE id = ?').run(hashPassword(password), name, existing.id);
    return { id: existing.id, updated: true };
  }
  const r = db.prepare('INSERT INTO admin_users (email, name, password_hash) VALUES (?,?,?)').run(email, name, hashPassword(password));
  return { id: Number(r.lastInsertRowid), updated: false };
}

/** Optional: create the first admin from ADMIN_EMAIL / ADMIN_PASSWORD env vars on start. */
function ensureAdminFromEnv() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM admin_users').get();
  if (n > 0 || !ADMIN_EMAIL || !ADMIN_PASSWORD) return n > 0;
  if (ADMIN_PASSWORD.length < 10) {
    console.warn('[admin] ADMIN_PASSWORD must be at least 10 characters — admin not created.');
    return false;
  }
  createAdmin(ADMIN_EMAIL.trim(), ADMIN_PASSWORD);
  console.log(`[admin] Admin account created for ${ADMIN_EMAIL}. You can now remove ADMIN_PASSWORD from your .env file.`);
  return true;
}

module.exports = {
  hashPassword, verifyPassword, createSessionCookie, clearSessionCookie, getSession,
  csrfToken, checkCsrf, authenticate, createAdmin, ensureAdminFromEnv,
};

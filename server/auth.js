const crypto = require('node:crypto');
const { db } = require('./db');

const SESSION_COOKIE = 'boss67_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_EMAIL = 'admin@boss67.local';
const DEFAULT_PASSWORD = 'boss67demo';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(String(password), salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  const [salt, expectedHex] = String(storedHash || '').split(':');
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function ensureAdminUser() {
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredEmail = String(process.env.BOSS67_ADMIN_EMAIL || '').trim().toLowerCase();
  const configuredPassword = String(process.env.BOSS67_ADMIN_PASSWORD || '');

  if (isProduction && (!configuredEmail || !configuredPassword)) {
    throw new Error('Em produção, BOSS67_ADMIN_EMAIL e BOSS67_ADMIN_PASSWORD são obrigatórios.');
  }

  const email = configuredEmail || DEFAULT_EMAIL;
  const password = configuredPassword || DEFAULT_PASSWORD;
  const existing = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(email);
  if (!existing) {
    db.prepare(`
      INSERT INTO admin_users (id, email, password_hash, name, active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(crypto.randomUUID(), email, hashPassword(password), 'Administrador', new Date().toISOString());
  }
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, part) => {
    const index = part.indexOf('=');
    if (index < 0) return cookies;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function getSession(req) {
  const token = parseCookies(req.headers.cookie || '')[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const now = new Date().toISOString();
  const session = db.prepare(`
    SELECT s.id AS session_id, s.expires_at, u.id, u.email, u.name
    FROM admin_sessions s
    JOIN admin_users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
  `).get(tokenHash, now);
  if (!session) return null;
  return { id: session.id, email: session.email, name: session.name, sessionId: session.session_id };
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare(`
    INSERT INTO admin_sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), userId, tokenHash, expiresAt, new Date().toISOString());
  return { token, expiresAt };
}

function setSessionCookie(res, token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

function login(req, res, payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  if (!email || !password) return { status: 400, body: { error: 'Informe e-mail e senha.' } };

  const user = db.prepare(`SELECT id, email, name, password_hash FROM admin_users WHERE email = ? AND active = 1`).get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { status: 401, body: { error: 'E-mail ou senha inválidos.' } };
  }

  db.prepare('DELETE FROM admin_sessions WHERE user_id = ? OR expires_at <= ?').run(user.id, new Date().toISOString());
  const session = createSession(user.id);
  setSessionCookie(res, session.token, session.expiresAt);
  return { status: 200, body: { user: { email: user.email, name: user.name } } };
}

function logout(req, res) {
  const session = getSession(req);
  if (session) db.prepare('DELETE FROM admin_sessions WHERE id = ?').run(session.sessionId);
  clearSessionCookie(res);
  return { status: 200, body: { message: 'Sessão encerrada.' } };
}

function requireAdmin(req, res) {
  const session = getSession(req);
  if (!session) {
    clearSessionCookie(res);
    return { ok: false, status: 401, body: { error: 'Não autenticado.' } };
  }
  return { ok: true, user: session };
}

module.exports = {
  ensureAdminUser,
  login,
  logout,
  getSession,
  requireAdmin
};
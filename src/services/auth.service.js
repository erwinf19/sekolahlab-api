const { scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const jwt = require('jsonwebtoken');
const { ApiError } = require('../lib/http');
const { readCollection } = require('../data');
const derive = promisify(scrypt);
const ISSUER = 'sekolahlab-api';
const AUDIENCE = 'sekolahlab-frontend';
const EXPIRES_IN = 3600;
function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.trim().length < 32) throw new ApiError(503, 'Autentikasi belum dikonfigurasi. Atur JWT_SECRET minimal 32 karakter.');
  return value;
}
function publicUser(user) {
  const { id, name, email, role, photo_url } = user;
  return { id, name, email, role, photo_url };
}
async function login(email, password) {
  const signingSecret = secret();
  const users = readCollection('users');
  const user = users.find(row => row.email === email);
  // Run a password check even for unknown emails; only fixture hashes are used.
  const [scheme, salt, hex] = (user || users[0]).password_hash.split('$');
  if (scheme !== 'scrypt' || !/^[a-f0-9]{128}$/.test(hex)) throw new Error('Invalid password fixture');
  const expected = Buffer.from(hex, 'hex');
  const actual = await derive(password, salt, expected.length);
  if (!timingSafeEqual(actual, expected) || !user) throw new ApiError(401, 'Email atau password salah.');
  return {
    user: publicUser(user),
    access_token: jwt.sign({}, signingSecret, { algorithm: 'HS256', subject: String(user.id), issuer: ISSUER, audience: AUDIENCE, expiresIn: EXPIRES_IN }),
    token_type: 'Bearer', expires_in: EXPIRES_IN
  };
}
function authenticate(req, res, next) {
  try {
    const match = /^Bearer\s+(\S+)$/i.exec(req.get('Authorization') || '');
    if (!match) throw new ApiError(401, 'Token diperlukan. Gunakan Authorization: Bearer <token>.');
    const signingSecret = secret();
    let claims;
    try {
      claims = jwt.verify(match[1], signingSecret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE, maxAge: EXPIRES_IN });
    } catch { throw new ApiError(401, 'Token tidak valid atau kedaluwarsa.'); }
    if (typeof claims !== 'object' || typeof claims.sub !== 'string' || !/^[1-9]\d*$/.test(claims.sub) || !Number.isFinite(claims.exp)) throw new ApiError(401, 'Token tidak valid.');
    const user = readCollection('users').find(row => String(row.id) === claims.sub);
    if (!user) throw new ApiError(401, 'Akun demo tidak ditemukan.');
    req.user = publicUser(user); // Role always comes from the fixture, never client claims.
    next();
  } catch (error) { next(error); }
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return next(new ApiError(403, 'Akses ini khusus admin.'));
  next();
}
module.exports = { login, authenticate, adminOnly };

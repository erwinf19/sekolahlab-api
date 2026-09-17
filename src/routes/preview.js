const { Router } = require('express');
const { scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { ApiError, ok } = require('../lib/http');
const { noQuery, jsonRequired, validateBody, string } = require('../lib/validation');
const { readCollection } = require('../data');
const config = require('../config/preview');
const derive = promisify(scrypt);
const router = Router();

router.route('/accounts').all((req, res, next) => {
  if (req.method !== 'POST') {
    res.set('Allow', 'POST, OPTIONS');
    return next(new ApiError(405, 'Gunakan POST untuk membuka daftar akun demo.'));
  }
  next();
}).post(noQuery, jsonRequired, async (req, res) => {
  const { password } = validateBody(req.body, { password: [string(1, 128), 'Password pembuka wajib diisi, maksimal 128 karakter.'] });
  const [scheme, salt, hex] = (process.env.PREVIEW_PASSWORD_HASH || config.passwordHash).split('$');
  if (scheme !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(hex || '')) throw new ApiError(503, 'Daftar akun demo belum dikonfigurasi.');
  const expected = Buffer.from(hex, 'hex');
  const actual = await derive(password, salt, expected.length);
  if (!timingSafeEqual(actual, expected)) throw new ApiError(401, 'Password pembuka tidak sesuai.');
  const accounts = readCollection('users').map(({ id, name, email, role }) => ({ id, name, email, role, password: config.demoPassword }));
  return ok(res, accounts, 'Daftar akun demo berhasil dibuka.');
});
module.exports = router;

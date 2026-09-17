const { readCollection } = require('../data');
const auth = require('../services/auth.service');
const { ApiError, ok, simulated } = require('../lib/http');
const { validateBody, string, email } = require('../lib/validation');
const emailRule = [email, 'Email harus valid dan maksimal 254 karakter.'];
exports.login = async (req, res) => {
  const data = validateBody(req.body, { email: emailRule, password: [string(1, 72), 'Password wajib diisi, maksimal 72 karakter.'] });
  return ok(res, await auth.login(data.email, data.password), 'Login berhasil.');
};
exports.register = (req, res) => {
  const data = validateBody(req.body, {
    name: [string(2, 100), 'Nama harus 2–100 karakter.'], email: emailRule,
    password: [string(8, 72), 'Password harus 8–72 karakter.'],
    password_confirmation: [string(8, 72), 'Konfirmasi password harus 8–72 karakter.']
  });
  if (data.password !== data.password_confirmation) throw new ApiError(422, 'Validasi gagal.', { password_confirmation: ['Konfirmasi password tidak sama.'] });
  if (readCollection('users').some(user => user.email === data.email)) throw new ApiError(409, 'Email sudah digunakan oleh akun demo.', { email: ['Email sudah digunakan.'] });
  return simulated(res, { id: null, name: data.name, email: data.email, role: 'student' }, 'Simulasi registrasi berhasil. Akun tidak disimpan.', 201);
};
exports.me = (req, res) => ok(res, req.user);

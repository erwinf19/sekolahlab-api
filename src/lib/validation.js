const { ApiError } = require('./http');
const { readCollection } = require('../data');
const own = (obj, key) => Object.hasOwn(obj, key);
const positiveInteger = value => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const integerString = value => typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
const string = (min, max) => value => typeof value === 'string' && [...value].length >= min && [...value].length <= max;
const email = value => string(3, 254)(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const oneOf = values => value => values.includes(value);
const reference = name => value => positiveInteger(value) && readCollection(name).some(row => row.id === value);
const referenceArray = name => value => Array.isArray(value) && value.length > 0 && new Set(value).size === value.length && value.every(reference(name));
const date = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10);
};
const httpsUrl = value => {
  if (!string(1, 2048)(value)) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password; } catch { return false; }
};
function validateBody(body, rules, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(422, 'Body harus berupa objek JSON.', { body: ['Gunakan objek JSON.'] });
  const errors = Object.create(null), result = Object.create(null);
  if (!Object.keys(body).length) errors.body = ['Minimal satu field harus diisi.'];
  for (const key of Object.keys(body)) if (!own(rules, key)) errors[key] = ['Field tidak diizinkan.'];
  for (const [key, [check, message]] of Object.entries(rules)) {
    if (!own(body, key) && partial) continue;
    let value = body[key];
    if (typeof value === 'string' && !key.startsWith('password')) value = value.trim();
    if (key === 'email' && typeof value === 'string') value = value.toLowerCase();
    if (!check(value)) errors[key] = [message]; else result[key] = value;
  }
  if (Object.keys(errors).length) throw new ApiError(422, 'Validasi gagal.', errors);
  return result;
}
function noQuery(req, res, next) {
  if (Object.keys(req.query).length) return next(new ApiError(400, 'Endpoint ini tidak menerima query parameter.'));
  next();
}
function jsonRequired(req, res, next) {
  if (!req.is('application/json')) return next(new ApiError(415, 'Gunakan Content-Type: application/json.'));
  next();
}
function id(value) {
  if (!integerString(value)) throw new ApiError(400, 'ID harus integer positif.', { id: ['ID tidak valid.'] });
  return Number(value);
}
module.exports = { string, email, oneOf, reference, referenceArray, date, httpsUrl, validateBody, noQuery, jsonRequired, id, integerString };

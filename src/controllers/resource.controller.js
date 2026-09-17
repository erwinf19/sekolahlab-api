const { readCollection } = require('../data');
const { ApiError, ok, simulated } = require('../lib/http');
const { id, validateBody } = require('../lib/validation');
const { list } = require('../services/query');
function find(rows, value) {
  const resourceId = id(value);
  const row = rows.find(row => row.id === resourceId);
  if (!row) throw new ApiError(404, 'Data tidak ditemukan.');
  return row;
}
module.exports = (collection, config) => ({
  list(req, res) {
    const result = list(readCollection(collection), req.query, config);
    return ok(res, result.data, 'Data berhasil diambil.', result.meta);
  },
  detail(req, res) { return ok(res, find(readCollection(collection), req.params.id)); },
  update(req, res) {
    const rows = readCollection(collection);
    const row = find(rows, req.params.id);
    const changes = validateBody(req.body, config.fields, true);
    for (const key of config.unique) {
      if (Object.hasOwn(changes, key) && rows.some(other => other.id !== row.id && other[key] === changes[key])) throw new ApiError(409, 'Nilai sudah digunakan.', { [key]: ['Nilai harus unik pada data contoh.'] });
    }
    return simulated(res, { ...row, ...changes }, 'Simulasi perubahan berhasil. Data tidak disimpan.');
  },
  remove(req, res) {
    const row = find(readCollection(collection), req.params.id);
    return simulated(res, { id: row.id }, 'Simulasi penghapusan berhasil. Data awal tetap tersedia.');
  }
});

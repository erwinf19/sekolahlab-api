class ApiError extends Error {
  constructor(status, message, errors = {}) { super(message); this.status = status; this.errors = errors; }
}
const ok = (res, data, message = 'Data berhasil diambil.', meta, status = 200) => {
  const payload = { success: true, message, data };
  if (meta !== undefined) payload.meta = meta;
  return res.status(status).json(payload);
};
const simulated = (res, data, message, status = 200) => ok(res, data, message, { simulation: true, persisted: false }, status);
module.exports = { ApiError, ok, simulated };

const { ApiError } = require('../lib/http');
exports.notFound = (req, res) => res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.', errors: {} });
exports.errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = 500, message = 'Terjadi kesalahan server.', errors = {};
  if (err instanceof ApiError) ({ status, message, errors } = err);
  else if (err instanceof URIError && err.status === 400) { status = 400; message = 'URL tidak valid.'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'JSON tidak valid.'; }
  else if (err.type === 'entity.too.large') { status = 413; message = 'Body request maksimal 100 KB.'; }
  else if (err.status === 415) { status = 415; message = 'Encoding atau charset tidak didukung.'; }
  res.status(status).json({ success: false, message, errors });
};

const { ok } = require('../lib/http');
exports.show = (req, res) => ok(res, { service: 'sekolahlab-api', status: 'ok', version: 'v1' });

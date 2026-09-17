const { Router } = require('express');
const { ApiError } = require('../lib/http');
const { noQuery, jsonRequired } = require('../lib/validation');
const { authenticate, adminOnly } = require('../services/auth.service');
const auth = require('../controllers/auth.controller');
const resources = require('../services/resources');
const controller = require('../controllers/resource.controller');
const { show } = require('../controllers/health.controller');
const router = Router();
function route(path, methods) {
  const target = router.route(path);
  target.all((req, res, next) => {
    if (!Object.hasOwn(methods, req.method)) {
      res.set('Allow', [...Object.keys(methods), 'OPTIONS'].join(', '));
      return next(new ApiError(405, 'HTTP method tidak didukung.'));
    }
    next();
  });
  for (const [method, handlers] of Object.entries(methods)) target[method.toLowerCase()](...handlers);
}
route('/health', { GET: [noQuery, show] });
route('/auth/login', { POST: [noQuery, jsonRequired, auth.login] });
route('/auth/register', { POST: [noQuery, jsonRequired, auth.register] });
route('/auth/me', { GET: [authenticate, noQuery, auth.me] });
for (const [name, config] of Object.entries(resources)) {
  const handlers = controller(name, config);
  route('/' + name, { GET: [handlers.list] });
  const methods = { GET: [noQuery, handlers.detail] };
  if (config.fields) {
    methods.PATCH = [authenticate, adminOnly, noQuery, jsonRequired, handlers.update];
    methods.DELETE = [authenticate, adminOnly, noQuery, handlers.remove];
  }
  route('/' + name + '/:id', methods);
}
module.exports = router;

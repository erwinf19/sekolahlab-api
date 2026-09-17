const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errors');
const app = express();
app.disable('x-powered-by');
app.set('query parser', 'simple');
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '100kb', strict: false }));
// Support both original URLs and direct Lambda-style function URLs.
app.use(['/api/v1', '/.netlify/functions/api/v1'], apiRoutes);
app.use(notFound);
app.use(errorHandler);
module.exports = app;

const express = require('express');
const path = require('node:path');
const api = require('./app');
const server = express();
server.use(express.static(path.join(__dirname, '../public')));
server.use(api);
const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log('SekolahLab: http://localhost:' + port));

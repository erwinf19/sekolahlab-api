require('./sync-docs').syncDocs();
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(root, 'public/index.html'));
console.log('Dokumentasi API siap di public/. Data dan secret tidak ikut dipublikasikan.');

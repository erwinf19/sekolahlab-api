const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const target = path.join(__dirname, '../.env');
try {
  fs.writeFileSync(target, 'PORT=3000\nJWT_SECRET=' + randomBytes(48).toString('hex') + '\n', { flag: 'wx', mode: 0o600 });
  console.log('.env lokal dibuat dengan secret acak. File ini diabaikan Git.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('.env sudah ada; tidak diubah. Pastikan JWT_SECRET minimal 32 karakter.');
}

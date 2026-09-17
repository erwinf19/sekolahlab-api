const fs = require('node:fs');
const path = require('node:path');
const { readCollection } = require('../src/data');
const { list } = require('../src/services/query');
const resources = require('../src/services/resources');
const root = path.join(__dirname, '..');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[char]));
// Demo credentials are available only after unlocking the preview panel.
const code = value => `<pre><code>${escape(JSON.stringify(value, (key, item) => key === 'password' || key === 'password_confirmation' ? '<password-akun-demo>' : item, 2))}</code></pre>`;

// Keep examples aligned with the same static records served by the API.
function syncDocs() {
  const mapping = JSON.parse(fs.readFileSync(path.join(root, 'mapping.json'), 'utf8'));
  for (const endpoint of mapping.endpoints) {
    const name = endpoint.path.split('/')[1];
    if (!resources[name]) continue;
    const rows = readCollection(name);
    if (endpoint.method === 'GET') {
      if (endpoint.path.includes(':id')) endpoint.response.data = rows[0];
      else Object.assign(endpoint.response, list(rows, {}, resources[name]));
    } else if (endpoint.method === 'PATCH') {
      endpoint.response.data = { ...rows[0], ...endpoint.request };
    }
  }
  const cards = mapping.endpoints.map(e => `<details class="endpoint" data-search="${escape(e.group + ' ' + e.title + ' /api/v1' + e.path)}" data-method="${e.method}" data-phase="${e.phase}"><summary><span class="method ${e.method.toLowerCase()}">${e.method}</span><code>/api/v1${e.path}</code><span class="endpoint-title">${escape(e.title)}</span><span class="access">${escape(e.access)}</span></summary><div class="endpoint-body"><p><span class="chip">${escape(e.phase)}</span> <span class="chip">${escape(e.group)}</span></p><p>${escape(e.desc)}</p><h4>Request body</h4>${e.request === null ? '<p class="muted">Tidak ada body.</p>' : code(e.request)}<h4>Respons ${e.status}</h4>${code(e.response)}<p class="muted">Error yang mungkin: ${escape(e.errors)}. Lihat tabel status dan aturan validasi.</p></div></details>`).join('');
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const endpointBlock = /(<div id="endpoint-list">)[\s\S]*?(<\/div><p id="empty")/;
  if (!endpointBlock.test(html)) throw new Error('Bagian endpoint dokumentasi tidak ditemukan.');
  html = html.replace(endpointBlock, (_, start, end) => start + cards + end);
  const counts = Object.entries({ students: 'siswa', teachers: 'guru', subjects: 'pelajaran', classes: 'kelas', majors: 'jurusan', news: 'berita', users: 'akun demo' }).map(([name, label]) => `${readCollection(name).length} ${label}`).join(', ');
  html = html.replace(/Fixture tersedia: [^.]*\./, `Fixture tersedia: ${counts}.`);
  fs.writeFileSync(path.join(root, 'mapping.json'), JSON.stringify(mapping, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'index.html'), html);
}
module.exports = { syncDocs };

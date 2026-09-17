const test = require('node:test');
const assert = require('node:assert/strict');
const { scryptSync } = require('node:crypto');
const { handler } = require('../netlify/functions/api');
const { readCollection } = require('../src/data');
function request(path, method = 'GET', body = null, extraHeaders = {}) {
  return handler({ httpMethod: method, path, headers: { host: 'localhost', 'content-type': 'application/json', ...extraHeaders }, queryStringParameters: null, body, isBase64Encoded: false, requestContext: { identity: {} } }, {});
}
test('Health works through public and function paths', async () => {
  for (const path of ['/api/v1/health', '/.netlify/functions/api/v1/health']) {
    const response = await request(path);
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).data.service, 'sekolahlab-api');
  }
});
test('Unknown route, invalid JSON, and CORS preflight', async () => {
  assert.equal((await request('/api/v1/missing')).statusCode,404);
  assert.equal((await request('/api/v1/auth/login','POST','{')).statusCode,400);
  const preflight = await request('/api/v1/students/1','OPTIONS',null, { origin:'https://frontend.example', 'access-control-request-method':'PATCH' });
  assert.equal(preflight.statusCode,204);
  assert.equal(preflight.headers['access-control-allow-origin'],'*');
});
test('Fixtures have expected counts, valid relations, unique IDs and avatar URLs', () => {
  const counts = {users:10,students:30,teachers:10,subjects:10,news:10,classes:13,majors:10};
  const data = Object.fromEntries(Object.keys(counts).map(name => [name,readCollection(name)]));
  for(const [name,count] of Object.entries(counts)) {
    assert.equal(data[name].length,count,name);
    assert.ok(data[name].length >= 10, name);
    assert.equal(new Set(data[name].map(x=>x.id)).size,count,name);
  }
  const exists=(name,id)=>data[name].some(x=>x.id===id);
  for(const s of data.students){ assert.ok(exists('classes',s.class_id));assert.ok(s.user_id===null||exists('users',s.user_id)); }
  for(const t of data.teachers){ assert.ok(t.subject_ids.every(id=>exists('subjects',id)));assert.ok(t.user_id===null||exists('users',t.user_id)); }
  for(const c of data.classes){ assert.ok(exists('majors',c.major_id));assert.ok(exists('teachers',c.homeroom_teacher_id)); }
  for(const n of data.news){assert.ok(exists('users',n.author_id));assert.equal(new URL(n.image_url).protocol,'https:');}
  const photos=[...data.students,...data.teachers].map(x=>x.photo_url);
  assert.equal(new Set(photos).size,photos.length);
  assert.ok(photos.every(url=>new URL(url).hostname==='api.dicebear.com'));
  for(const user of data.users){ const [scheme,salt,hash]=user.password_hash.split('$');assert.equal(scheme,'scrypt');assert.equal(scryptSync('Belajar123!',salt,64).toString('hex'),hash);assert.equal(user.password,undefined); }
});
test('Reading fixtures provides an isolated copy', () => {
  const students=readCollection('students');students[0].name='Changed';
  assert.equal(readCollection('students')[0].name,'Alya Putri');
});

test('All classes, majors, subjects and linked demo profiles are represented consistently', () => {
  const names=['users','students','teachers','classes','majors','subjects','news'];
  const data=Object.fromEntries(names.map(name=>[name,readCollection(name)]));
  for(const major of data.majors) assert.ok(data.classes.some(row=>row.major_id===major.id));
  for(const group of data.classes) assert.ok(data.students.some(row=>row.class_id===group.id));
  for(const subject of data.subjects) assert.ok(data.teachers.some(row=>row.subject_ids.includes(subject.id)));
  for(const user of data.users.filter(row=>row.role!=='admin')) {
    const profiles=data[user.role==='teacher'?'teachers':'students'].filter(row=>row.user_id===user.id);
    assert.equal(profiles.length,1);
    assert.equal(profiles[0].name,user.name);
    assert.equal(profiles[0].photo_url,user.photo_url);
  }
  for(const [name,field] of [['users','email'],['students','nis'],['teachers','teacher_code'],['subjects','code'],['majors','code'],['news','slug']]) {
    assert.equal(new Set(data[name].map(row=>row[field])).size,data[name].length, name+' '+field);
  }
  assert.ok(data.users.every(user=>user.email.endsWith('@sekolahlab.com')));
});

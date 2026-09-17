const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { handler } = require('../netlify/functions/api');
const { readCollection } = require('../src/data');
const SECRET = 'test-only-sekolahlab-secret-never-for-deployment-2026';
process.env.JWT_SECRET = SECRET;
async function request(path, method='GET', body, token, options={}) {
  const url = new URL(path, 'https://test.example');
  const query = Object.fromEntries(url.searchParams);
  const multi = {};
  for (const key of url.searchParams.keys()) multi[key] = url.searchParams.getAll(key);
  const result = await handler({ httpMethod: method, path: url.pathname, headers: { host:'test.example', ...(body !== undefined ? {'content-type':'application/json'} : {}), ...(token ? {authorization:'Bearer '+token} : {}), ...options.headers }, queryStringParameters: query, multiValueQueryStringParameters: multi, body: options.raw !== undefined ? options.raw : body === undefined ? null : JSON.stringify(body), isBase64Encoded:false, requestContext:{identity:{}} }, {});
  return {status:result.statusCode, body: result.body ? JSON.parse(result.body) : null, headers:result.headers};
}
const login = async (role='admin') => {
  const result = await request('/api/v1/auth/login','POST',{email:role+'@sekolahlab.com',password:'Belajar123!'});
  assert.equal(result.status,200);
  return result.body.data.access_token;
};
const sign = (sub='1', extra={}, options={}) => jwt.sign(extra,SECRET,{algorithm:'HS256',issuer:'sekolahlab-api',audience:'sekolahlab-frontend',subject:sub,expiresIn:3600,...options});

test('Login all roles, normalize email, safe profile and auth cache headers', async () => {
  for(const [email,role] of [['admin','admin'],['guru','teacher'],['siswa','student']]) {
    const token=await login(email);
    const result=await request('/api/v1/auth/me','GET',undefined,token);
    assert.equal(result.status,200);assert.equal(result.body.data.role,role);
    assert.equal(result.body.data.password_hash,undefined);assert.equal(result.headers['cache-control'],'no-store');
  }
  const normalized=await request('/api/v1/auth/login','POST',{email:' ADMIN@SEKOLAHLAB.COM ',password:'Belajar123!'});
  assert.equal(normalized.status,200);
  assert.equal(normalized.body.data.expires_in,3600);
  assert.ok(!JSON.stringify(normalized.body).includes('scrypt$'));
});
test('Login rejects wrong credentials and malformed input', async () => {
  for(const email of ['admin@sekolahlab.com','missing@example.com']) assert.equal((await request('/api/v1/auth/login','POST',{email,password:'wrong-password'})).status,401);
  for(const body of [{},null,[],42,{email:'invalid',password:'a'},{email:'admin@sekolahlab.com',password:'Belajar123!',role:'admin'}]) assert.equal((await request('/api/v1/auth/login','POST',body)).status,422);
});
test('JWT rejects forged, expired, wrong algorithm, issuer, audience, missing expiry and unknown user', async () => {
  const invalid=[ 'bad-token', sign('1',{}, {expiresIn:-1}), sign('999'), sign('1',{}, {algorithm:'HS384'}), sign('1',{}, {issuer:'other'}), sign('1',{}, {audience:'other'}), jwt.sign({sub:'1',iss:'sekolahlab-api',aud:'sekolahlab-frontend'},SECRET), jwt.sign({sub:'1'},'wrong-secret'), sign('1',{nbf:Math.floor(Date.now()/1000)+60}) ];
  for(const token of invalid) assert.equal((await request('/api/v1/auth/me','GET',undefined,token)).status,401);
  assert.equal((await request('/api/v1/auth/me')).status,401);
});
test('Register validates and returns no credential; repeated registration is allowed and cannot login', async () => {
  const input={name:' Dina Lestari ',email:' DINA@EXAMPLE.COM ',password:'Belajar123!',password_confirmation:'Belajar123!'};
  const before=readCollection('users');
  for(let i=0;i<2;i++) {
    const result=await request('/api/v1/auth/register','POST',input);
    assert.equal(result.status,201);assert.deepEqual(result.body.meta,{simulation:true,persisted:false});
    assert.deepEqual(result.body.data,{id:null,name:'Dina Lestari',email:'dina@example.com',role:'student'});
  }
  assert.equal((await request('/api/v1/auth/login','POST',{email:'dina@example.com',password:input.password})).status,401);
  assert.equal((await request('/api/v1/auth/register','POST',{...input,email:'ADMIN@SEKOLAHLAB.COM'})).status,409);
  for(const change of [{password_confirmation:'different'},{role:'admin'},{name:'a'},{password:'short'},{email:'invalid'}]) assert.equal((await request('/api/v1/auth/register','POST',{...input,...change})).status,422);
  assert.deepEqual(readCollection('users'),before);
});
test('Every collection has public list/detail, correct pagination and no sensitive fields', async () => {
  for(const name of ['students','teachers','subjects','news','classes','majors']) {
    const expected=readCollection(name);
    const list=await request('/api/v1/'+name);
    assert.equal(list.status,200);assert.equal(list.body.meta.total,expected.length);
    assert.equal(list.body.data.length,Math.min(10,expected.length));
    const detail=await request('/api/v1/'+name+'/1');assert.equal(detail.status,200);assert.deepEqual(detail.body.data,expected[0]);
    assert.equal((await request('/api/v1/'+name+'/999999')).status,404);
    assert.equal((await request('/api/v1/'+name+'/0')).status,400);
    assert.equal((await request('/api/v1/'+name+'/1?unexpected=1')).status,400);
    assert.ok(!JSON.stringify(list.body).includes('password_hash'));
  }
  assert.equal((await request('/api/v1/users')).status,404);
});
test('Search, AND filters, sorting, empty results and page bounds', async () => {
  const students=await request('/api/v1/students?search=ALYA&class_id=1&gender=female');
  assert.equal(students.body.meta.total,1);assert.equal(students.body.data[0].name,'Alya Putri');
  assert.equal((await request('/api/v1/students?search=alya&class_id=2')).body.meta.total,0);
  assert.deepEqual((await request('/api/v1/students?page=99')).body.data,[]);
  assert.equal((await request('/api/v1/students?class_id=999')).body.meta.total_pages,0);
  const p=await request('/api/v1/students?page=2&limit=5&sort=id&order=desc');
  assert.deepEqual(p.body.data.map(x=>x.id),[25,24,23,22,21]);assert.equal(p.body.meta.total_pages,6);
  assert.ok((await request('/api/v1/teachers?subject_id=2')).body.data.every(t=>t.subject_ids.includes(2)));
  assert.ok((await request('/api/v1/classes?major_id=1&grade=10')).body.data.every(c=>c.major_id===1&&c.grade===10));
  assert.equal((await request('/api/v1/majors?search=rpl')).body.meta.total,1);
  const news=await request('/api/v1/news');assert.equal(news.body.data[0].id,10);
  assert.ok((await request('/api/v1/news?category=prestasi')).body.data.every(x=>x.category==='prestasi'));
});
test('Invalid and duplicate query parameters are rejected', async () => {
  for(const query of ['page=0','limit=101','limit=-1','page=1.5','page=1e2','page=9007199254740993','page=1&page=2','search=a&search=b','sort=password_hash','order=down','unknown=x','class_id=bad','gender=other','class_id=1&class_id=2','search='+('x'.repeat(101))]) {
    const response=await request('/api/v1/students?'+query);
    assert.equal(response.status,400,query);assert.equal(response.body.success,false);
  }
  assert.equal((await request('/api/v1/health?foo=1')).status,400);
});
test('Admin PATCH/DELETE of all main resources are nonpersistent across requests', async () => {
  const token=await login();
  const patches={students:{name:'Nama Siswa Baru',class_id:2},teachers:{subject_ids:[1,2]},subjects:{name:'Pelajaran Baru'},news:{title:'Judul Berita Baru',image_url:'https://example.com/new.png'}};
  for(const [resource,patch] of Object.entries(patches)) {
    const original=(await request('/api/v1/'+resource+'/1')).body.data;
    const edited=await request('/api/v1/'+resource+'/1','PATCH',patch,token);
    assert.equal(edited.status,200);assert.deepEqual(edited.body.data,{...original,...patch});assert.equal(edited.body.meta.persisted,false);
    assert.deepEqual((await request('/api/v1/'+resource+'/1')).body.data,original);
    for(let i=0;i<2;i++) assert.equal((await request('/api/v1/'+resource+'/1','DELETE',undefined,token)).status,200);
    assert.deepEqual((await request('/api/v1/'+resource+'/1')).body.data,original);
    assert.equal((await request('/api/v1/'+resource+'/99999','DELETE',undefined,token)).status,404);
  }
});
test('Only fixture admin can mutate; token role claim cannot elevate permissions', async () => {
  for(const token of [await login('guru'),await login('siswa'),sign('3',{role:'admin'})]) {
    assert.equal((await request('/api/v1/students/1','PATCH',{name:'Updated'},token)).status,403);
    assert.equal((await request('/api/v1/news/1','DELETE',undefined,token)).status,403);
  }
  assert.equal((await request('/api/v1/students/1','DELETE')).status,401);
});
test('PATCH validates types, allowlists, relation IDs, dates, enums, unique fields and URLs', async () => {
  const token=await login();
  const bad=[['students',{}],['students',{id:2}],['students',{photo_url:'https://example.com/photo.jpg'}],['students',{name:null}],['students',{gender:'other'}],['students',{class_id:999}],['students',{class_id:'1'}],['students',{birth_date:'2025-02-30'}],['students',{birth_date:'2999-01-01'}],['teachers',{subject_ids:[]}],['teachers',{subject_ids:[1,1]}],['teachers',{subject_ids:[999]}],['news',{image_url:'http://example.com/image.png'}],['news',{image_url:'https://user:password@example.com/image.png'}],['news',{slug:'change'}],['news',{category:'unknown'}]];
  for(const [resource,body] of bad) assert.equal((await request('/api/v1/'+resource+'/1','PATCH',body,token)).status,422,JSON.stringify(body));
  for(const [resource,body] of [['students',{nis:readCollection('students')[1].nis}],['teachers',{teacher_code:readCollection('teachers')[1].teacher_code}],['subjects',{code:readCollection('subjects')[1].code}]]) assert.equal((await request('/api/v1/'+resource+'/1','PATCH',body,token)).status,409);
  assert.equal((await request('/api/v1/students/1','PATCH',{nis:readCollection('students')[0].nis},token)).status,200);
  assert.equal((await request('/api/v1/students/1','PATCH',undefined,token,{raw:'{"__proto__":{"admin":true}}',headers:{'content-type':'application/json'}})).status,422);
  assert.equal({}.admin,undefined);
});
test('Protocol errors, method guards, CORS, malformed and oversized JSON', async () => {
  assert.equal((await request('/api/v1/auth/login','POST',undefined,undefined,{raw:'{',headers:{'content-type':'application/json'}})).status,400);
  assert.equal((await request('/api/v1/auth/login','POST',{},undefined,{headers:{'content-type':'text/plain'}})).status,415);
  assert.equal((await request('/api/v1/auth/register','POST',{name:'a'.repeat(110000)})).status,413);
  const method=await request('/api/v1/students','POST',{});assert.equal(method.status,405);assert.equal(method.headers.allow,'GET, OPTIONS');
  assert.equal((await request('/api/v1/classes/1','DELETE')).status,405);
  const preflight=await request('/api/v1/students/1','OPTIONS',undefined,undefined,{headers:{origin:'https://frontend.example','access-control-request-method':'PATCH'}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers['access-control-allow-origin'],'*');
  assert.ok(preflight.headers['access-control-allow-headers'].includes('Authorization'));
  assert.equal((await request('/.netlify/functions/api/v1/students?limit=2')).body.data.length,2);
});
test('Missing secret fails closed for auth; public endpoints still work', async () => {
  delete process.env.JWT_SECRET;
  try {
    assert.equal((await request('/api/v1/auth/login','POST',{email:'admin@sekolahlab.com',password:'Belajar123!'})).status,503);
    assert.equal((await request('/api/v1/students')).status,200);
    process.env.JWT_SECRET='short';
    assert.equal((await request('/api/v1/auth/me','GET',undefined,sign())).status,503);
  } finally { process.env.JWT_SECRET=SECRET; }
});

test('Every demo account can log in and returns its matching safe profile', async () => {
  for(const user of readCollection('users')) {
    const response=await request('/api/v1/auth/login','POST',{email:user.email,password:'Belajar123!'});
    assert.equal(response.status,200,user.email);
    const profile=await request('/api/v1/auth/me','GET',undefined,response.body.data.access_token);
    const {password_hash,...safe}=user;
    assert.deepEqual(profile.body.data,safe);
  }
});
test('Pagination reaches every record once and every fixture has a working detail URL', async () => {
  for(const name of ['students','teachers','subjects','classes','majors','news']) {
    const expected=readCollection(name), collected=[];
    for(let page=1;page<=Math.ceil(expected.length/4);page++) {
      const response=await request(`/api/v1/${name}?page=${page}&limit=4`);
      assert.equal(response.status,200);
      collected.push(...response.body.data.map(row=>row.id));
    }
    assert.equal(new Set(collected).size,expected.length);
    assert.deepEqual(collected.sort((a,b)=>a-b),expected.map(row=>row.id).sort((a,b)=>a-b));
    for(const row of expected) assert.deepEqual((await request(`/api/v1/${name}/${row.id}`)).body.data,row);
  }
});
test('All 24 documented success examples match real handler responses', async () => {
  const mapping=require('../mapping.json');
  assert.equal(mapping.endpoints.length,24);
  const token=await login();
  for(const endpoint of mapping.endpoints) {
    const url='/api/v1'+endpoint.path.replace(':id','1');
    const response=await request(url,endpoint.method,endpoint.request??undefined,endpoint.access==='Publik'?undefined:token);
    assert.equal(response.status,endpoint.status,endpoint.method+' '+url);
    if(endpoint.path==='/auth/login') response.body.data.access_token='<token-demo-dari-backend>';
    assert.deepEqual(response.body,endpoint.response,endpoint.method+' '+url);
  }
});
test('Malformed path encoding returns a client error with JSON', async () => {
  const response=await request('/api/v1/students/%E0%A4%A');
  assert.equal(response.status,400);
  assert.equal(response.body.success,false);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { scryptSync } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { handler } = require('../netlify/functions/api');
const { readCollection } = require('../src/data');
const password = 'preview-test-only';
process.env.PREVIEW_PASSWORD_HASH = 'scrypt$preview-test-salt$' + scryptSync(password, 'preview-test-salt', 64).toString('hex');
async function request(body, method='POST', route='/api/preview/accounts', query=null) {
  const result=await handler({httpMethod:method,path:route,headers:{host:'localhost','content-type':'application/json'},queryStringParameters:query,body:body===undefined?null:JSON.stringify(body),isBase64Encoded:false,requestContext:{identity:{}}},{});
  return {status:result.statusCode,headers:result.headers,body:JSON.parse(result.body)};
}
test('Preview gate rejects wrong password, missing fields and unsupported access', async () => {
  for(const body of [{password:'wrong'}, {password:password+' '}]) {
    const result=await request(body);assert.equal(result.status,401);assert.equal(result.body.data,undefined);
    assert.equal(result.headers['cache-control'],'no-store');
  }
  for(const body of [{}, [], null, {password:''},{password,role:'admin'}]) assert.equal((await request(body)).status,422);
  assert.equal((await request(undefined,'GET')).status,405);
  assert.equal((await request({password},'POST','/api/preview/accounts',{password})).status,400);
});
test('Correct preview password returns all 10 usable accounts through both Netlify paths', async () => {
  for(const route of ['/api/preview/accounts','/.netlify/functions/api/preview/accounts']) {
    const result=await request({password},'POST',route);
    assert.equal(result.status,200);assert.equal(result.headers['cache-control'],'no-store');
    const users=readCollection('users');assert.equal(result.body.data.length,users.length);
    for(const account of result.body.data) {
      assert.deepEqual(Object.keys(account).sort(),['id','name','email','role','password'].sort());
      const user=users.find(row=>row.id===account.id);
      assert.equal(account.email,user.email);assert.equal(account.role,user.role);
      const [,salt,hash]=user.password_hash.split('$');
      assert.equal(scryptSync(account.password,salt,64).toString('hex'),hash);
    }
  }
});
test('Unlocking does not authorize later unauthenticated requests', async () => {
  assert.equal((await request({password})).status,200);
  assert.equal((await request({password:'wrong'})).status,401);
  assert.equal((await request(undefined,'GET')).status,405);
});
test('Malformed preview configuration fails closed', async () => {
  const original=process.env.PREVIEW_PASSWORD_HASH;
  try {process.env.PREVIEW_PASSWORD_HASH='invalid';assert.equal((await request({password})).status,503);}
  finally {process.env.PREVIEW_PASSWORD_HASH=original;}
});
test('Published documentation contains the locked panel but no demo passwords or account table data', () => {
  const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
  const {demoPassword,passwordHash}=require('../src/config/preview');
  assert.ok(html.includes('id="accounts-result" hidden'));
  assert.ok(html.includes('<tbody id="accounts-rows"></tbody>'));
  assert.ok(!html.includes(demoPassword));assert.ok(!html.includes(passwordHash));
  assert.ok(!html.includes('ratna@sekolahlab.com'));
  assert.ok(!html.includes('localStorage'));assert.ok(!html.includes('sessionStorage'));
});

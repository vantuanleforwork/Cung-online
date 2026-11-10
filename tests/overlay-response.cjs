const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'overlay.js'), 'utf8');
const requestSource = source.match(/async function request\([\s\S]*?\r?\n}\r?\nfunction startLease/)[0].replace(/\r?\nfunction startLease$/, '');
const context = {K: 'test', AbortController, Date, setTimeout, clearTimeout, encodeURIComponent, JSON};
vm.createContext(context);
vm.runInContext(requestSource, context);

(async () => {
  context.fetch = async () => ({status: 503, headers: new Headers({'Content-Type':'text/html'}), json: async () => { throw Error('Unexpected token <'); }});
  await assert.rejects(context.request('poll.php'), error =>
    error.message.includes('poll.php') && error.message.includes('HTTP 503') && !error.message.includes('Unexpected token'));

  context.fetch = async () => ({status: 200, headers: new Headers({'Content-Type':'application/json'}), json: async () => [{id: 1}]});
  const result = await context.request('poll.php');
  assert.equal(result.data[0].id, 1);
  console.log('PASS: OBS reports HTML response clearly and accepts JSON');
})().catch(error => {console.error(error); process.exitCode = 1;});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { singleFlight, internalRequestOptions, fetchRecipientPayload } = require('../../backend/reminder-service/src/scheduler-guard');

test('overlapping ticks skip the same lane and resume after settlement', async () => {
  let release;
  let calls = 0;
  const run = singleFlight(async () => {
    calls++;
    if (calls === 1) await new Promise(resolve => { release = resolve; });
  });
  const first = run();
  assert.equal(await run(), false);
  assert.equal(calls, 1);
  release();
  assert.equal(await first, true);
  assert.equal(await run(), true);
  assert.equal(calls, 2);
});

test('failure releases the lane and does not block another lane', async () => {
  let calls = 0;
  const run = singleFlight(async () => { if (++calls === 1) throw Error('fixture'); });
  const independent = singleFlight(async () => {});
  await assert.rejects(run(), /fixture/);
  assert.equal(await independent(), true);
  assert.equal(await run(), true);
});

test('internal requests get a fresh deadline and reject redirects', async () => {
  const one = internalRequestOptions();
  const two = internalRequestOptions();
  assert.equal(one.redirect, 'error');
  assert.ok(one.signal instanceof AbortSignal);
  assert.notEqual(one.signal, two.signal);
  assert.equal(one.signal.aborted, false);
  let followed = false;
  const server = http.createServer((req, res) => {
    if (req.url === '/target') { followed = true; res.end('unexpected'); return; }
    res.writeHead(302, { Location: '/target' }); res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await assert.rejects(fetch(`http://127.0.0.1:${server.address().port}/start`, {
      ...one, headers: { 'x-internal-api-key': 'synthetic-test-only' },
    }));
    assert.equal(followed, false);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('a stalled response body reaches its deadline and releases the lane', { timeout: 20000 }, async () => {
  const server = http.createServer((_req, res) => res.write('partial response'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let first = true;
  const run = singleFlight(async () => {
    if (!first) return;
    first = false;
    await fetchRecipientPayload(`http://127.0.0.1:${server.address().port}/`, {});
  });
  try {
    await assert.rejects(run(), { name: 'TimeoutError' });
    assert.equal(await run(), true);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

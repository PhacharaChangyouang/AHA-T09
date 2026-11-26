import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { academicFrontendOrigin } from '../src/lib/academic-origin.mjs';

const origin = 'http://localhost:3000';
const eventId = '00000000-0000-4000-8000-000000000001';
const routeSource = fs.readFileSync(new URL('../src/app/api/sponsors/veerachan/click/route.js', import.meta.url), 'utf8');
const workerSource = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
async function route(frontend = origin) {
  const context = vm.createContext({ process: { env: { FRONTEND_URL: frontend } }, fetch() { assert.fail('Sponsor must not contact any upstream'); } });
  const mod = new vm.SourceTextModule(routeSource, { context });
  await mod.link(async (specifier) => {
    const values = specifier === 'next/server' ? { NextResponse: { json: (body, init) => Response.json(body, init) } } :
      specifier === '../../../../../lib/academic-origin.mjs' ? { academicFrontendOrigin } : null;
    assert.ok(values, 'Unexpected module dependency');
    return new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, { context });
  });
  await mod.evaluate();
  return (body = JSON.stringify({ eventId }), headers = {}) => mod.namespace.POST(new Request(origin + '/api/sponsors/veerachan/click', {
    method: 'POST', headers: { origin, 'content-type': 'application/json', 'x-aha-request': '1', ...headers }, body,
  }));
}
test('valid sponsor click is a local acknowledgement with no cache', async () => {
  const call = await route(); const response = await call();
  assert.equal(response.status, 202); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { success: true });
});
test('sponsor rejects cross-origin, missing request header and remote configuration', async () => {
  const call = await route();
  for (const headers of [{ origin: 'https://attacker.invalid' }, { 'x-aha-request': '' }, { 'sec-fetch-site': 'cross-site' }, { 'content-type': 'text/plain' }]) assert.equal((await call(undefined, headers)).status, 403);
  assert.equal((await (await route('https://remote.invalid'))()).status, 403);
});
test('sponsor rejects malformed, oversized and unexpected body fields', async () => {
  const call = await route();
  for (const body of ['{', '{}', 'null', JSON.stringify({ eventId: 'bad' }), JSON.stringify({ eventId, extra: true }), ' '.repeat(201)]) assert.equal((await call(body)).status, 400);
});
test('sponsor limits repeated attempts', async () => {
  const call = await route(); for (let i = 0; i < 30; i++) assert.equal((await call()).status, 202);
  assert.equal((await call()).status, 429);
});
function worker(fetchImpl) {
  const handlers = {};
  vm.runInNewContext(workerSource, { self: { location: { origin }, addEventListener: (name, fn) => { handlers[name] = fn; } }, URL, Response, fetch: fetchImpl });
  return handlers;
}
test('PWA handles offline navigation without exposing cached health information', async () => {
  const handlers = worker(async () => { throw Error('Offline fixture'); });
  let result; handlers.fetch({ request: { url: origin + '/home', method: 'GET', mode: 'navigate' }, respondWith: (p) => { result = p; } });
  const response = await result;
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(await response.text(), /ไม่ได้ยืนยันการทำรายการใด ๆ/);
});
test('PWA bypasses API and cross-origin navigation; real push handlers are absent', () => {
  const handlers = worker(() => assert.fail('Unexpected fetch'));
  for (const request of [{ url: origin + '/api/bff/auth/auth/me', method: 'GET', mode: 'navigate' }, { url: 'https://remote.invalid/home', method: 'GET', mode: 'navigate' }, { url: origin + '/home', method: 'POST', mode: 'navigate' }]) handlers.fetch({ request, respondWith: () => assert.fail('Must bypass') });
  assert.equal(handlers.push, undefined); assert.equal(handlers.notificationclick, undefined);
});

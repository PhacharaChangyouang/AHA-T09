import test from 'node:test';
import assert from 'node:assert/strict';
import { academicServiceOrigin, academicFrontendOrigin } from '../src/lib/academic-origin.mjs';
test('only the matching local service port and approved Docker service names are allowed', () => {
  assert.equal(academicServiceOrigin('auth', ''), 'http://127.0.0.1:3001');
  assert.equal(academicServiceOrigin('notification', 'http://aha-notification-service:3003'), 'http://aha-notification-service:3003');
  assert.equal(academicServiceOrigin('auth', 'http://localhost:3002'), '');
  assert.equal(academicServiceOrigin('constructor', ''), '');
});
test('remote service origins, credentials, paths and protocol tricks fail closed', () => {
  for (const value of ['https://api.example.invalid', 'http://localhost:3001@remote.invalid', 'http://localhost:3001/api', 'http://localhost:3001.evil.invalid', 'http://localhost:3001/', 'https://localhost:3001']) {
    assert.equal(academicServiceOrigin('auth', value), '');
  }
});
test('frontend origin must be explicitly loopback', () => {
  assert.equal(academicFrontendOrigin(''), 'http://localhost:3000');
  assert.equal(academicFrontendOrigin('http://127.0.0.1:3000'), 'http://127.0.0.1:3000');
  assert.equal(academicFrontendOrigin('https://localhost:3443'), 'https://localhost:3443');
  for (const value of ['https://example.invalid', 'http://localhost:3000@evil.invalid', 'http://localhost:3000/path', 'http://localhost.evil.invalid']) assert.equal(academicFrontendOrigin(value), '');
});

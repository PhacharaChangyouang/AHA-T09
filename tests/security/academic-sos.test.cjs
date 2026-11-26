'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { hasLocationFields } = require('../../backend/notification-service/src/config/academic-sos');

test('message-only SOS does not contain location fields', () => {
  assert.equal(hasLocationFields({ message: 'synthetic SOS' }), false);
});
test('valid numeric coordinates are rejected', () => {
  assert.equal(hasLocationFields({ latitude: 0, longitude: 0 }), true);
});
test('out-of-range coordinates are rejected', () => {
  assert.equal(hasLocationFields({ latitude: 200, longitude: 100 }), true);
});
test('accuracy-only fields are rejected', () => {
  assert.equal(hasLocationFields({ accuracy: 10 }), true);
});
test('explicit null and string location fields are rejected', () => {
  assert.equal(hasLocationFields({ latitude: null }), true);
  assert.equal(hasLocationFields({ longitude: '0' }), true);
});
test('absent body does not throw', () => {
  assert.equal(hasLocationFields(undefined), false);
});

'use strict';

// A running lane must settle before the next interval may enter it.
function singleFlight(task) {
  let running = false;
  return async function run() {
    if (running) return false;
    running = true;
    try {
      await task();
      return true;
    } finally {
      running = false;
    }
  };
}

// Match the existing session verification policy: never forward internal keys
// through redirects. A deadline covers both headers and body consumption.
function internalRequestOptions() {
  return { signal: AbortSignal.timeout(10000), redirect: 'error' };
}

async function fetchRecipientPayload(url, headers) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new DOMException('Recipient lookup timed out', 'TimeoutError');
      reject(error);
      controller.abort(error);
    }, 10000);
  });
  async function readPayload() {
    const response = await fetch(url, { headers, signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new Error('Recipient lookup failed: ' + response.status);
    return response.json();
  }
  try {
    return await Promise.race([readPayload(), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { singleFlight, internalRequestOptions, fetchRecipientPayload };

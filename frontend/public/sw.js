self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A real offline navigation response supports older install-prompt checks.
// Never cache authenticated HTML, API responses, health data or credentials.
const OFFLINE_DOCUMENT = '<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AHA · ไม่มีอินเทอร์เน็ต</title><style>body{font:20px/1.7 system-ui,sans-serif;margin:0;padding:32px 20px;color:#171717;background:#fff}main{max-width:560px;margin:10vh auto}a{display:inline-block;color:#171717;border:2px solid #1d4ed8;border-radius:12px;padding:12px 18px;min-height:24px}h1{font-size:30px}</style><main><h1>ยังเชื่อมต่อ AHA ไม่ได้</h1><p>กรุณาตรวจสอบอินเทอร์เน็ต แล้วเปิดอีกครั้ง หน้านี้ไม่แสดงข้อมูลสุขภาพที่บันทึกไว้ และไม่ได้ยืนยันการทำรายการใด ๆ</p><a href="/home">ลองเปิด AHA อีกครั้ง</a></main></html>';
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || url.origin !== self.location.origin ||
      url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;
  event.respondWith(fetch(event.request).catch(() => new Response(OFFLINE_DOCUMENT, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  })));
});

// Academic: no inbound Web Push or delivery receipts.

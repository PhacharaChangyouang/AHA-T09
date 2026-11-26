import { NextResponse } from 'next/server';
import { academicFrontendOrigin } from '../../../../../lib/academic-origin.mjs';

export const runtime = 'nodejs';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const attempts = new Map();
function response(status) { return NextResponse.json({ success: status === 202 }, { status, headers: { 'Cache-Control': 'no-store' } }); }

export async function POST(request) {
  const origin = request.headers.get('origin');
  const expected = academicFrontendOrigin(process.env.FRONTEND_URL);
  if (!expected || origin !== expected || request.headers.get('x-aha-request') !== '1' ||
    !request.headers.get('content-type')?.startsWith('application/json') ||
    request.headers.get('sec-fetch-site') === 'cross-site') return response(403);
  // Ephemeral abuse control only; addresses are never sent upstream or stored.
  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim().slice(0,100);
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  if (attempts.size >= 10000 && !attempts.has(ip)) return response(429);
  const bucket = attempts.get(ip) || { until: now + 60000, count: 0 };
  attempts.set(ip, bucket);
  if (++bucket.count > 30) return response(429);
  let body;
  try {
    const raw = await request.text(); if (raw.length > 200) return response(400);
    body = JSON.parse(raw);
  } catch { return response(400); }
  if (!body || Object.keys(body).length !== 1 || !UUID.test(body.eventId || '')) return response(400);
  // Academic simulation: acknowledge valid events without storing or forwarding them.
  return response(202);
}

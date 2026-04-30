import { kv } from '@vercel/kv';

export const config = {
  api: {
    bodyParser: true,
  },
};

function json(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function getRoomId(req) {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  return url.searchParams.get('roomId')?.trim() || '';
}

export default async function handler(req, res) {
  try {
    const roomId = getRoomId(req);
    if (!roomId) return json(res, 400, { error: 'Missing roomId' });
    if (roomId.length > 128) return json(res, 400, { error: 'roomId too long' });

    const key = `studyflow:sync:${roomId}`;

    if (req.method === 'GET') {
      const record = await kv.get(key);
      return json(res, 200, record ? record : { payload: null, updatedAt: null });
    }

    if (req.method === 'PUT') {
      const payload = req.body?.payload;
      if (!payload) return json(res, 400, { error: 'Missing payload' });

      const record = {
        payload,
        updatedAt: Date.now(),
      };

      await kv.set(key, record);
      return json(res, 200, record);
    }

    res.setHeader('Allow', 'GET, PUT');
    return json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return json(res, 500, { error: 'Server error' });
  }
}

import { kv } from '@vercel/kv';

const ROOM_ID_RE = /^[A-Za-z0-9_-]{8,80}$/;

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  // Basic CORS (same-origin friendly; also allows calling from preview domains).
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('roomId')?.trim() ?? '';

  if (!ROOM_ID_RE.test(roomId)) {
    sendJson(res, 400, { error: 'Invalid roomId.' });
    return;
  }

  const key = `studyflow:room:${roomId}`;

  if (req.method === 'GET') {
    const record = await kv.get(key);
    if (!record) {
      sendJson(res, 404, { error: 'Not found.' });
      return;
    }
    sendJson(res, 200, record);
    return;
  }

  if (req.method === 'PUT') {
    let body = '';
    for await (const chunk of req) body += chunk;

    let json;
    try {
      json = body ? JSON.parse(body) : null;
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON body.' });
      return;
    }

    const payload = json?.payload ?? null;
    if (!payload || typeof payload !== 'object') {
      sendJson(res, 400, { error: 'Missing payload.' });
      return;
    }

    const record = {
      payload,
      updatedAt: Date.now(),
    };

    await kv.set(key, record);
    sendJson(res, 200, { ok: true, updatedAt: record.updatedAt });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed.' });
}


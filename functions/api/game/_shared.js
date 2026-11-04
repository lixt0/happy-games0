const GAME_ID_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
const SESSION_ID_RE = /^[0-9a-f-]{36}$/i;
const EVENT_ID_RE = /^[0-9a-f-]{36}$/i;
const EVENT_TYPES = new Set([
  'game_started',
  'game_paused',
  'game_resumed',
  'game_restarted',
  'score_snapshot',
  'score_delta',
  'level_up',
  'move',
  'mistake',
  'hint_used',
  'game_won',
  'game_lost',
  'game_abandoned',
  'game_finished',
  'state_snapshot',
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  });
}

function parseCookie(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

async function getUser(request, env) {
  const token = parseCookie(request.headers.get('cookie')).hg_token;
  if (!token || !env.DB) return null;
  const session = await env.DB.prepare(
    'SELECT username, expires_at FROM sessions WHERE token = ?'
  ).bind(token).first();
  return session && session.expires_at > Date.now() ? session.username : null;
}

function validId(value, pattern) {
  return typeof value === 'string' && pattern.test(value);
}

function numberOrNull(value, { min = -1000000000, max = 1000000000 } = {}) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function safeJson(value, maxBytes = 8192) {
  let text;
  try { text = JSON.stringify(value && typeof value === 'object' ? value : {}); } catch { return null; }
  return new TextEncoder().encode(text).byteLength <= maxBytes ? text : null;
}

async function readJson(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 128 * 1024) return { error: json({ error: '请求体过大' }, 413) };
  try { return { body: await request.json() }; } catch { return { error: json({ error: '请求格式错误' }, 400) }; }
}

export {
  EVENT_TYPES,
  EVENT_ID_RE,
  GAME_ID_RE,
  SESSION_ID_RE,
  getUser,
  json,
  numberOrNull,
  readJson,
  safeJson,
  validId,
};

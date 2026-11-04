import { clone, tick } from '../../../feixingqi/engine.js';

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function parseCookie(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export async function whoami(request, env) {
  const cookie = parseCookie(request.headers.get('cookie'));
  const token = cookie.hg_token;
  if (!token) return null;
  const s = await env.DB.prepare(
    'SELECT username, expires_at FROM sessions WHERE token = ?'
  ).bind(token).first();
  if (s && s.expires_at > Date.now()) return s.username;
  return null;
}

export async function loadRoom(env, code) {
  const row = await env.DB.prepare(
    'SELECT state, password FROM feixingqi_rooms WHERE code = ?'
  ).bind(code).first();
  if (!row) return null;
  return { state: JSON.parse(row.state), password: row.password };
}

export async function saveRoom(env, code, state) {
  const now = Date.now();
  await env.DB.prepare(
    'UPDATE feixingqi_rooms SET state = ?, updated_at = ? WHERE code = ?'
  ).bind(JSON.stringify(state), now, code).run();
}

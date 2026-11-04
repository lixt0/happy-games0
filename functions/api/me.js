function parseCookie(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export async function onRequestGet({ request, env }) {
  const cookie = parseCookie(request.headers.get('cookie'));
  const token = cookie.hg_token;
  if (token) {
    const s = await env.DB.prepare(
      'SELECT username, expires_at FROM sessions WHERE token = ?'
    ).bind(token).first();
    if (s && s.expires_at > Date.now()) {
      return new Response(JSON.stringify({ username: s.username }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  return new Response(JSON.stringify({ username: null }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
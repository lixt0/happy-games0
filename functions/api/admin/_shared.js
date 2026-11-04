export function json(data, status = 200) {
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

export async function requireAdmin(request, env) {
  const token = parseCookie(request.headers.get('cookie')).hg_token;
  if (!token || !env.DB) return null;
  const session = await env.DB.prepare(
    'SELECT username, expires_at FROM sessions WHERE token = ?'
  ).bind(token).first();
  return session && session.expires_at > Date.now() && session.username === 'zhoujun' ? session : null;
}

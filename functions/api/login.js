const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;

async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const username = (body.username || '').trim();
  const password = body.password || '';
  if (!username || !password) return json({ error: '用户名和密码不能为空' }, 400);

  const row = await env.DB.prepare('SELECT password FROM users WHERE username = ?')
    .bind(username).first();
  if (!row) return json({ error: '用户名不存在' }, 404);

  const hash = await sha256(password);
  if (hash !== row.password) return json({ error: '密码错误' }, 401);

  const token = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, ?)'
  ).bind(token, username, now + SESSION_TTL).run();

  return new Response(JSON.stringify({ ok: true, username }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `hg_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL / 1000)}`,
    },
  });
}
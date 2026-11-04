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

function setSessionCookie(token) {
  const parts = [
    `hg_token=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL / 1000)}`,
  ];
  return parts.join('; ');
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: '数据库未绑定（D1 binding 缺失）' }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const username = (body.username || '').trim();
  const password = body.password || '';
  if (!/^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/.test(username)) {
    return json({ error: '用户名需为 3–20 位（字母数字下划线/中文）' }, 400);
  }
  if (typeof password !== 'string' || password.length < 6) {
    return json({ error: '密码至少 6 位' }, 400);
  }

  const existing = await env.DB.prepare('SELECT username FROM users WHERE username = ?')
    .bind(username).first();
  if (existing) return json({ error: '该用户名已被注册' }, 409);

  const hash = await sha256(password);
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)'
  ).bind(username, hash, now).run();

  const token = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, ?)'
  ).bind(token, username, now + SESSION_TTL).run();

  return new Response(JSON.stringify({ ok: true, username }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setSessionCookie(token),
    },
  });
}
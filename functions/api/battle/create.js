export async function onRequestPost({ request, env }) {
  const { username, password } = await request.json();
  if (!username || !password) {
    return json({ error: '缺少参数' }, 400);
  }
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const now = Date.now();
  const state = JSON.stringify({ phase: 'waiting', players: { A: username, B: null }, password });
  await env.DB.prepare(
    'INSERT INTO battle_rooms (code, password, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(code, password, state, now, now).run();
  return json({ code });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

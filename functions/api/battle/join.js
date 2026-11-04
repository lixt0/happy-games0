export async function onRequestPost({ request, env }) {
  const { code, password, username } = await request.json();
  if (!code || !password || !username) {
    return json({ error: '缺少参数' }, 400);
  }
  const room = await env.DB.prepare('SELECT * FROM battle_rooms WHERE code = ?').bind(code).first();
  if (!room) return json({ error: '房间不存在' }, 404);
  const state = JSON.parse(room.state);
  if (state.password !== password) return json({ error: '密码错误' }, 403);
  if (state.players.B && state.players.B !== username) return json({ error: '房间已满' }, 409);
  if (state.players.A === username) return json({ error: '你是房主，等待对手加入' }, 409);

  state.players.B = username;
  state.phase = 'ready';
  await env.DB.prepare('UPDATE battle_rooms SET state = ?, updated_at = ? WHERE code = ?')
    .bind(JSON.stringify(state), Date.now(), code).run();
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

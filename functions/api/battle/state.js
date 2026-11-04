export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return json({ error: '缺少房间号' }, 400);
  const room = await env.DB.prepare('SELECT state FROM battle_rooms WHERE code = ?').bind(code).first();
  if (!room) return json({ error: '房间不存在' }, 404);
  const state = JSON.parse(room.state);
  delete state.password;
  return json(state);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

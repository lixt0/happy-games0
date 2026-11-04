// 房主分流式战报时增量保存到 D1，对手轮询 GET 拿最新文本
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const { code, text, done } = body;
  if (!code || typeof text !== 'string') return json({ error: '缺少参数' }, 400);

  const room = await env.DB.prepare('SELECT state FROM battle_rooms WHERE code = ?').bind(code).first();
  if (!room) return json({ error: '房间不存在' }, 404);
  const state = JSON.parse(room.state);
  state.analysis = text;
  state.analysisDone = !!done;
  await env.DB.prepare('UPDATE battle_rooms SET state = ?, updated_at = ? WHERE code = ?')
    .bind(JSON.stringify(state), Date.now(), code).run();
  return json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return json({ error: '缺少房间号' }, 400);
  const room = await env.DB.prepare('SELECT state FROM battle_rooms WHERE code = ?').bind(code).first();
  if (!room) return json({ error: '房间不存在' }, 404);
  const state = JSON.parse(room.state);
  return json({ text: state.analysis || '', done: !!state.analysisDone });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
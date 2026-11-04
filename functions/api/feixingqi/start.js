import { json, whoami, loadRoom, saveRoom } from './_shared.js';
import { startMatch } from '../../../feixingqi/engine.js';

export async function onRequestPost({ request, env }) {
  const username = await whoami(request, env);
  if (!username) return json({ error: '未登录' }, 401);
  const { code } = await request.json();
  const room = await loadRoom(env, code);
  if (!room) return json({ error: '房间不存在' }, 404);
  if (room.state.seats[0].username !== username) return json({ error: '仅房主可开始' }, 403);
  if (room.state.phase !== 'waiting') return json({ error: '已开始' }, 409);
  const state = startMatch(room.state, Date.now());
  await saveRoom(env, code, state);
  return json({ ok: true });
}

import { json, whoami, loadRoom, saveRoom } from './_shared.js';
import { joinSeat } from '../../../feixingqi/engine.js';

export async function onRequestPost({ request, env }) {
  const username = await whoami(request, env);
  if (!username) return json({ error: '未登录' }, 401);
  const { code, password } = await request.json();
  if (!code || !password) return json({ error: '缺少参数' }, 400);
  const room = await loadRoom(env, code);
  if (!room) return json({ error: '房间不存在' }, 404);
  if (room.password !== password) return json({ error: '密码错误' }, 403);
  if (room.state.phase !== 'waiting') return json({ error: '对局已开始' }, 409);
  if (room.state.seats.some(s => s.username === username)) return json({ error: '你已在房间' }, 409);
  const { state, seat } = joinSeat(room.state, username);
  if (seat < 0) return json({ error: '房间已满' }, 409);
  await saveRoom(env, code, state);
  return json({ ok: true, seat });
}

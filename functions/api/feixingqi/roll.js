import { json, whoami, loadRoom, saveRoom } from './_shared.js';
import { rollDice, touch, tick } from '../../../feixingqi/engine.js';

export async function onRequestPost({ request, env }) {
  const username = await whoami(request, env);
  if (!username) return json({ error: '未登录' }, 401);
  const { code } = await request.json();
  const room = await loadRoom(env, code);
  if (!room) return json({ error: '房间不存在' }, 404);
  let state = room.state;
  if (state.phase === 'playing') state = tick(state, Date.now());
  const seatIdx = state.seats.findIndex(s => s.username === username);
  if (seatIdx < 0) return json({ error: '你不在该房间' }, 403);
  if (state.turn !== seatIdx) return json({ error: '还没轮到你' }, 400);
  const seat = state.seats[seatIdx];
  if (seat.kind !== 'human' || seat.autoAi) return json({ error: '当前由 AI 行棋' }, 400);
  if (state.rolled) return json({ error: '已掷骰，请先走子' }, 400);
  state = rollDice(state);
  touch(state, Date.now());
  await saveRoom(env, code, state);
  return json({ ok: true, dice: state.dice });
}

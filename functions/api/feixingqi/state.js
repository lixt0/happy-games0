import { json, loadRoom, saveRoom } from './_shared.js';
import { tick } from '../../../feixingqi/engine.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return json({ error: '缺少房间号' }, 400);
  const room = await loadRoom(env, code);
  if (!room) return json({ error: '房间不存在' }, 404);
  let state = room.state;
  if (state.phase === 'playing') {
    state = tick(state, Date.now());
    if (state !== room.state) await saveRoom(env, code, state);
  }
  return json(state);
}

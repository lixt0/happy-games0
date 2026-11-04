import { json, whoami } from './_shared.js';
import { createInitialState } from '../../../feixingqi/engine.js';

function randCode() { return String(Math.floor(1000 + Math.random() * 9000)); }

export async function onRequestPost({ request, env }) {
  const username = await whoami(request, env);
  if (!username) return json({ error: '未登录' }, 401);
  const { password, seatCount } = await request.json();
  if (!password || ![2, 3, 4].includes(seatCount)) return json({ error: '参数错误' }, 400);
  const code = randCode();
  const now = Date.now();
  const state = createInitialState({ seed: now % 2147483647, seatCount, hostUsername: username });
  await env.DB.prepare(
    'INSERT INTO feixingqi_rooms (code, password, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(code, password, JSON.stringify(state), now, now).run();
  return json({ code });
}

import {
  GAME_ID_RE,
  getUser,
  json,
  readJson,
  safeJson,
  validId,
} from './_shared.js';
import { createSession } from '../../services/game-service.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: '数据库不可用' }, 503);
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body || {};
  const gameId = typeof body.gameId === 'string' ? body.gameId.trim() : '';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const anonymousId = typeof body.anonymousId === 'string' ? body.anonymousId.trim().slice(0, 80) : null;
  const metadata = safeJson(body.metadata);
  if (!validId(gameId, GAME_ID_RE) || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return json({ error: '游戏会话参数无效' }, 400);
  }
  if (!metadata) return json({ error: '会话信息过大或格式错误' }, 400);

  const username = await getUser(request, env);
  await createSession(env.DB, {
    id: sessionId,
    gameId,
    username,
    anonymousId,
    metadata,
  });
  return json({ ok: true, sessionId, username: username || null });
}

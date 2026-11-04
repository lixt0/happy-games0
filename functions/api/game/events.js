import {
  EVENT_ID_RE,
  EVENT_TYPES,
  GAME_ID_RE,
  getUser,
  json,
  numberOrNull,
  readJson,
  safeJson,
  SESSION_ID_RE,
  validId,
} from './_shared.js';
import { recordEvents } from '../../services/game-service.js';

function normalizeEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const eventId = typeof event.eventId === 'string' ? event.eventId.trim() : '';
  const eventType = typeof event.type === 'string' ? event.type.trim() : '';
  const payload = safeJson(event.payload);
  if (!validId(eventId, EVENT_ID_RE) || !EVENT_TYPES.has(eventType) || !payload) return null;
  const score = numberOrNull(event.score);
  const scoreDelta = numberOrNull(event.scoreDelta);
  const clientAt = numberOrNull(event.clientAt, { min: 0, max: Date.now() + 86400000 });
  return { eventId, eventType, payload, score, scoreDelta, clientAt };
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: '数据库不可用' }, 503);
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body || {};
  const gameId = typeof body.gameId === 'string' ? body.gameId.trim() : '';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const rawEvents = Array.isArray(body.events) ? body.events : [];
  if (!validId(gameId, GAME_ID_RE) || !validId(sessionId, SESSION_ID_RE)) {
    return json({ error: '游戏会话参数无效' }, 400);
  }
  if (!rawEvents.length || rawEvents.length > 50) return json({ error: '事件数量无效' }, 400);
  const events = rawEvents.map(normalizeEvent);
  if (events.some(event => !event)) return json({ error: '包含非法事件' }, 400);
  const username = await getUser(request, env);
  const result = await recordEvents(env.DB, { gameId, sessionId, username, events });
  if (result.error === 'not_found') return json({ error: '游戏会话不存在' }, 404);
  if (result.error === 'forbidden') return json({ error: '无权访问该游戏会话' }, 403);
  if (result.error === 'finished') return json({ error: '游戏会话已结束' }, 409);
  return json({ ok: true, accepted: result.accepted });
}

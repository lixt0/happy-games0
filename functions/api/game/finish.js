import {
  GAME_ID_RE,
  getUser,
  json,
  numberOrNull,
  readJson,
  safeJson,
  SESSION_ID_RE,
  validId,
} from './_shared.js';
import { finishSessionForGame } from '../../services/game-service.js';

const OUTCOMES = new Set(['won', 'lost', 'abandoned', 'finished']);

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: '数据库不可用' }, 503);
  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;
  const body = parsed.body || {};
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const gameId = typeof body.gameId === 'string' ? body.gameId.trim() : '';
  const outcome = typeof body.outcome === 'string' ? body.outcome.trim() : '';
  const score = numberOrNull(body.score, { min: 0 });
  const durationMs = numberOrNull(body.durationMs, { min: 0, max: 7 * 86400000 });
  const metadata = safeJson(body.metadata);
  if (!validId(sessionId, SESSION_ID_RE) || !validId(gameId, GAME_ID_RE) || !OUTCOMES.has(outcome)) {
    return json({ error: '结算参数无效' }, 400);
  }
  if (!metadata || score === null && body.score !== undefined) return json({ error: '结算数据无效' }, 400);

  const username = await getUser(request, env);
  const result = await finishSessionForGame(env.DB, {
    gameId,
    sessionId,
    username,
    outcome,
    score: score ?? 0,
    durationMs,
    metadata,
  });
  if (result.error === 'not_found') return json({ error: '游戏会话不存在' }, 404);
  if (result.error === 'forbidden') return json({ error: '无权访问该游戏会话' }, 403);
  if (result.alreadyFinished) return json({ ok: true, alreadyFinished: true });
  return json({ ok: true, sessionId, outcome: result.outcome, score: result.score });
}

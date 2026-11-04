import { finishSession, findSession, insertEvents, insertSession } from '../repositories/game-repository.js';

export function createSession(db, input) {
  const now = Date.now();
  return insertSession(db, {
    ...input,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export async function recordEvents(db, input) {
  const session = await findSession(db, input.sessionId);
  if (!session || session.game_id !== input.gameId) return { error: 'not_found' };
  if (session.username && session.username !== input.username) return { error: 'forbidden' };
  if (session.status !== 'playing' && session.status !== 'paused') return { error: 'finished' };
  const now = Date.now();
  await insertEvents(db, input.events.map(event => ({
    ...event,
    sessionId: input.sessionId,
    gameId: input.gameId,
    username: input.username,
    createdAt: now,
  })));
  return { accepted: input.events.length };
}

export async function finishSessionForGame(db, input) {
  const session = await findSession(db, input.sessionId);
  if (!session || session.game_id !== input.gameId) return { error: 'not_found' };
  if (session.username && session.username !== input.username) return { error: 'forbidden' };
  if (session.status !== 'playing' && session.status !== 'paused') return { alreadyFinished: true };
  const now = Date.now();
  const durationMs = input.durationMs ?? Math.max(0, now - session.started_at);
  await finishSession(db, {
    ...input,
    endedAt: now,
    updatedAt: now,
    durationMs,
    createdAt: now,
  });
  return { score: input.score, outcome: input.outcome, durationMs };
}
